from django.contrib import admin

from .models import ActivityEvent


@admin.register(ActivityEvent)
class ActivityEventAdmin(admin.ModelAdmin):
    date_hierarchy = "occurred_at"
    list_display = (
        "occurred_at",
        "event_type",
        "category",
        "actor_email_snapshot",
        "module",
        "status_code",
    )
    list_filter = ("category", "module", "event_type", "http_method", "status_code")
    search_fields = (
        "actor_email_snapshot",
        "event_type",
        "object_id",
        "request_id",
        "path",
    )
    readonly_fields = tuple(field.name for field in ActivityEvent._meta.fields)
    ordering = ("-occurred_at",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

