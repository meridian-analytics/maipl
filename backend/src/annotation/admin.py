from django.contrib import admin
from guardian.admin import GuardedModelAdmin

from .models import (
    Annotation,
    Batch,
    Permission,
    ProcessedAudio,
    ProcessedImage,
    Role,
    Segment,
    UserRoleBatch,
)


class ProcessedAudioAdmin(admin.ModelAdmin):
    list_display = ("id", "segment_id", "batch_id", "user_id", "created_at")
    search_fields = ("id", "segment_id", "batch_id", "user_id", "created_at")
    list_filter = ("batch_id", "user_id", "created_at")


class ProcessedImageAdmin(admin.ModelAdmin):
    list_display = ("id", "segment_id", "batch_id", "user_id", "created_at")
    search_fields = (
        "id",
        "segment_id",
        "batch_id",
        "user_id",
        "created_at",
        "updated_at",
    )
    list_filter = ("batch_id", "user_id", "created_at")


class BatchAdmin(GuardedModelAdmin):
    list_display = (
        "id",
        "batch_name",
        "parameters",
        "annotation_file_text",
        "annotation_file",
        "segment_parameters",
        "import_file",
        "created_at",
        "user_id",
    )
    search_fields = ("id", "batch_name", "created_at", "user_id")
    list_filter = ("created_at", "user_id")


class SegmentAdmin(admin.ModelAdmin):
    list_display = ("id", "filename", "start", "end", "tag", "created_at", "user_id")
    search_fields = ("id", "filename", "tag", "created_at", "user_id")
    list_filter = ("tag", "created_at", "user_id")


class AnnotationAdmin(admin.ModelAdmin):
    list_display = ("id", "segment", "batch", "file", "created_at", "user_id")
    search_fields = ("id", "segment", "batch", "file", "created_at", "user_id")
    list_filter = ("batch", "created_at", "user_id")


admin.site.register(ProcessedAudio, ProcessedAudioAdmin)
admin.site.register(ProcessedImage, ProcessedImageAdmin)
admin.site.register(Batch, BatchAdmin)
admin.site.register(Segment, SegmentAdmin)
admin.site.register(Annotation, AnnotationAdmin)
admin.site.register(Role)
admin.site.register(Permission)
admin.site.register(UserRoleBatch)
