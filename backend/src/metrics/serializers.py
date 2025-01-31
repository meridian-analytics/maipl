from rest_framework import serializers
from .models import MetricsTask
from file.models import File
from file.serializers import ReadSerializer


class MetricSerializer(serializers.ModelSerializer):

    bg_audio_list = serializers.PrimaryKeyRelatedField(
        many=True, queryset=File.objects, required=False
    )

    output_files = serializers.PrimaryKeyRelatedField(
        many=True, queryset=File.objects, required=False
    )

    class Meta:
        model = MetricsTask
        exclude = ("user",)

class MetricsReadSerializer(serializers.ModelSerializer):

    bg_audio_list = ReadSerializer(many=True)
    output_files = ReadSerializer(many=True)
    eval_file = ReadSerializer()
    ref_file = ReadSerializer()

    class Meta:
        model = MetricsTask
        fields = "__all__"
