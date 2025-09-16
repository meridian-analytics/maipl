from django.contrib.auth import get_user_model
from rest_framework import serializers
from file.models import File

from .models import TrainingTask

class TrainingTaskSerializer(serializers.ModelSerializer):

    dataset_file = serializers.PrimaryKeyRelatedField(queryset=File.objects.all())
    recipe_file = serializers.PrimaryKeyRelatedField(queryset=File.objects.all(), required=False)
    model_file = serializers.PrimaryKeyRelatedField(queryset=File.objects.all(), required=False)
    
    class Meta:
        model = TrainingTask
        fields = '__all__'
        read_only_fields = ('id', 'status', 'created_at', 'updated_at', 'user')

    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.get(id=self.context['request'].user.id)
        validated_data['user'] = user
        return super().create(validated_data)
