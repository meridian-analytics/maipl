from rest_framework import serializers

from common.shared_mixins import CreatorMixin
from file.models import File

from .models import Detection, ModelRunnerTask


class ModelRunnerTaskSerializer(CreatorMixin, serializers.ModelSerializer):
    # handle the GET request for retrieving a model task
    filelist = serializers.PrimaryKeyRelatedField(many=True, queryset=File.objects.all())
    model_file = serializers.PrimaryKeyRelatedField(queryset=File.objects.all())
    detections = serializers.PrimaryKeyRelatedField(queryset=File.objects.all(), required=False)

    class Meta:
        model = ModelRunnerTask
        fields = '__all__'
        read_only_fields = ('id', 'status', 'created_at', 'updated_at', 'user_id')



class DetectionSerializer(CreatorMixin, serializers.ModelSerializer):
    # handle the GET request for retrieving a model task
    file_path = serializers.SerializerMethodField('get_filename')
    task = serializers.PrimaryKeyRelatedField(queryset=ModelRunnerTask.objects.all())

    class Meta:
        model = Detection
        exclude = ('updated_at',)
        read_only_fields = ('id', 'created_at', 'updated_at', 'user_id')

    def get_filename(self, obj):
      # return the filename of the file associated with the detection
      return obj.file.path 