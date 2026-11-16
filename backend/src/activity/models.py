from django.conf import settings
from django.db import models


class ActivityEvent(models.Model):
    class Category(models.TextChoices):
        AUDIT = "audit", "Audit"
        USAGE = "usage", "Usage"
        SECURITY = "security", "Security"

    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_events",
    )
    actor_email_snapshot = models.EmailField(blank=True)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.AUDIT
    )
    event_type = models.CharField(max_length=100, db_index=True)
    module = models.CharField(max_length=50, blank=True, db_index=True)
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=255, blank=True)
    request_id = models.UUIDField(null=True, blank=True, db_index=True)
    session_id = models.CharField(max_length=100, blank=True)
    path = models.CharField(max_length=2048, blank=True)
    http_method = models.CharField(max_length=10, blank=True)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-occurred_at",)
        indexes = [
            models.Index(fields=("actor", "occurred_at"), name="activity_actor_time_idx"),
            models.Index(
                fields=("event_type", "occurred_at"),
                name="activity_event_time_idx",
            ),
        ]

    def __str__(self):
        return f"{self.event_type} at {self.occurred_at.isoformat()}"

