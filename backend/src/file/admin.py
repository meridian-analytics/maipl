from django.contrib import admin
from django.core.handlers.wsgi import WSGIRequest
from django.db.models.query import QuerySet

from .models import File

# https://docs.djangoproject.com/en/2.2/ref/contrib/admin/actions/#writing-action-functions


def delete_everywhere(model_admin: File,
                      request: WSGIRequest,
                      queryset: QuerySet):
    """
    Delete object both in Django and in MinIO too.
    :param model_admin: unused
    :param request: unused
    :param queryset: A QuerySet containing the set of objects selected by the user
    :return:
    """
    del model_admin, request  # We don't need these
    for obj in queryset:
        obj.delete()


delete_everywhere.short_description = "Delete selected objects in Django and MinIO"


class FileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_id', 'path', 'maipl_folder', 'tag', 'meta', 'updated_at', 'size']
    list_filter = ['user_id', 'maipl_folder', 'tag']
    search_fields = ['path', 'maipl_folder', 'tag']
    model = File
    actions = [delete_everywhere, ]

    def size(self, file):
        return "{:.1f} MB".format(file.size / 1000000)

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions


admin.site.register(File, FileAdmin)
