import time
import uuid

from django.conf import settings

from .services import track_event


class ActivityTrackingMiddleware:
    MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
    EXCLUDED_PREFIXES = ("/admin/", "/api/auth/")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.activity_request_id = uuid.uuid4()
        started_at = time.monotonic()
        response = self.get_response(request)
        response["X-Request-ID"] = str(request.activity_request_id)

        if self._should_track(request):
            track_event(
                event_type="api.request.completed",
                category="audit" if response.status_code < 400 else "security",
                actor=getattr(request, "user", None),
                module=self._module_from_path(request.path),
                request=request,
                status_code=response.status_code,
                duration_ms=round((time.monotonic() - started_at) * 1000),
            )
        return response

    def _should_track(self, request):
        user = getattr(request, "user", None)
        return (
            settings.ACTIVITY_TRACKING_ENABLED
            and
            request.method in self.MUTATING_METHODS
            and request.path.startswith("/api/")
            and not request.path.startswith(self.EXCLUDED_PREFIXES)
            and getattr(user, "is_authenticated", False)
        )

    @staticmethod
    def _module_from_path(path):
        parts = path.strip("/").split("/")
        return parts[1][:50] if len(parts) > 1 else "api"

