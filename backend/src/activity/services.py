import hashlib
import logging
from collections.abc import Mapping

from django.conf import settings

from .models import ActivityEvent

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "access",
    "authorization",
    "code",
    "cookie",
    "current_password",
    "password",
    "refresh",
    "secret",
    "token",
    "verifier",
}
MAX_METADATA_DEPTH = 5


def sanitize_metadata(value, depth=0):
    """Remove credentials from event metadata and keep it JSON serializable."""
    if depth >= MAX_METADATA_DEPTH:
        return "[truncated]"
    if isinstance(value, Mapping):
        return {
            str(key): "[redacted]"
            if str(key).lower() in SENSITIVE_KEYS
            else sanitize_metadata(item, depth + 1)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [sanitize_metadata(item, depth + 1) for item in value]
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    return str(value)


def hash_identifier(identifier):
    normalized = (identifier or "").strip().lower().encode("utf-8")
    return hashlib.sha256(normalized).hexdigest() if normalized else ""


def track_event(*, event_type, category=ActivityEvent.Category.AUDIT, actor=None,
                module="", obj=None, request=None, status_code=None,
                duration_ms=None, metadata=None):
    """Best-effort event writer. Tracking must never interrupt the user action."""
    try:
        actor_id = getattr(actor, "pk", None) or getattr(actor, "id", None)
        actor_email = getattr(actor, "email", "") or ""
        is_authenticated = getattr(actor, "is_authenticated", False)
        if not is_authenticated:
            actor_id = None
            actor_email = ""

        object_type = ""
        object_id = ""
        if obj is not None:
            object_type = obj._meta.label_lower
            object_id = str(obj.pk)

        request_meta = getattr(request, "META", {}) if request is not None else {}
        ip_address = (
            request_meta.get("REMOTE_ADDR")
            if settings.ACTIVITY_CAPTURE_IP
            else None
        )
        session = getattr(request, "session", None) if request is not None else None

        event = ActivityEvent.objects.create(
            actor_id=actor_id,
            actor_email_snapshot=actor_email,
            category=category,
            event_type=event_type,
            module=module,
            object_type=object_type,
            object_id=object_id,
            request_id=getattr(request, "activity_request_id", None),
            session_id=session.session_key if session is not None else "",
            path=request.path[:2048] if request is not None else "",
            http_method=request.method[:10] if request is not None else "",
            status_code=status_code,
            duration_ms=duration_ms,
            ip_address=ip_address or None,
            user_agent=request_meta.get("HTTP_USER_AGENT", "")[:512],
            metadata=sanitize_metadata(metadata or {}),
        )
        if request is not None:
            request.activity_explicitly_tracked = True
            underlying_request = getattr(request, "_request", None)
            if underlying_request is not None:
                underlying_request.activity_explicitly_tracked = True
        return event
    except Exception:
        logger.exception("Unable to persist activity event %s", event_type)
        return None

