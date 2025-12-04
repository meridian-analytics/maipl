from rest_framework import serializers

from common.shared_mixins import CreatorMixin
from file.models import File

from .models import Detection, ModelRunnerTask


class ModelRunnerTaskSerializer(CreatorMixin, serializers.ModelSerializer):
    # handle the GET request for retrieving a model task
    filelist = serializers.PrimaryKeyRelatedField(many=True, queryset=File.objects.all())
    model_file = serializers.PrimaryKeyRelatedField(queryset=File.objects.all())
    detections = serializers.PrimaryKeyRelatedField(queryset=File.objects.all(), required=False)
    model_file_name = serializers.SerializerMethodField()

    class Meta:
        model = ModelRunnerTask
        fields = ['id', 'description', 'celery_task_id', 'user_id', 'filelist', 'model_file', 
                  'detections', 'parameters', 'status', 'created_at', 'updated_at', 'model_file_name']
        read_only_fields = ('id', 'status', 'created_at', 'updated_at', 'user_id', 'model_file_name')

    def get_model_file_name(self, obj):
        if obj.model_file:
            return obj.model_file.basename
        return None



class DetectionSerializer(CreatorMixin, serializers.ModelSerializer):
    # handle the GET request for retrieving a model task
    task = serializers.PrimaryKeyRelatedField(queryset=ModelRunnerTask.objects.all())

    class Meta:
        model = Detection
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'user_id')