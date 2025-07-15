from django.contrib import admin

# Register your models here.
from .models import Detection, ModelRunnerTask


class ModelRunnerTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'description', 'user_id', 'model_file', 'detections', 'parameters', 'status', 'created_at', 'updated_at')
    list_filter = ('user_id', 'status', 'created_at')

class DetectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'filename', 'start', 'end', 'score', 'label', 'task', 'user_id')
    list_filter = ('user_id', 'task', 'created_at')

admin.site.register(ModelRunnerTask, ModelRunnerTaskAdmin)
admin.site.register(Detection, DetectionAdmin)