from django.contrib.auth import get_user_model
from rest_framework import serializers

from common.shared_mixins import CreatorMixin
from file.models import File
from user.serializers import UserSerializer

from .models import DatabaseTask, DatabaseGroup

User = get_user_model()


# Custom mixin for models with 'user' field instead of 'user_id'
class UserCreatorMixin:
    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.get(id=self.context['request'].user.id)
        validated_data['user'] = user
        return super().create(validated_data)


class DatabaseGroupSerializer(serializers.ModelSerializer):
    """Serializer for DatabaseGroup model."""
    
    task = serializers.PrimaryKeyRelatedField(queryset=DatabaseTask.objects.all())
    
    class Meta:
        model = DatabaseGroup
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class DatabaseGroupReadSerializer(serializers.ModelSerializer):
    """Read-only serializer for DatabaseGroup with nested data."""
    
    task = serializers.PrimaryKeyRelatedField(read_only=True)
    owner = UserSerializer(read_only=True, source="task.user")
    
    class Meta:
        model = DatabaseGroup
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'task', 'owner')


class DatabaseTaskSerializer(UserCreatorMixin, serializers.ModelSerializer):
    """Serializer for DatabaseTask model."""
    
    database_file = serializers.PrimaryKeyRelatedField(
        queryset=File.objects.all(), 
        required=False, 
        allow_null=True
    )
    groups = DatabaseGroupSerializer(many=True, read_only=True)
    
    class Meta:
        model = DatabaseTask
        fields = '__all__'
        read_only_fields = ('id', 'status', 'created_at', 'updated_at', 'user', 'groups')


class DatabaseTaskReadSerializer(serializers.ModelSerializer):
    """Read-only serializer for DatabaseTask with nested data."""
    
    database_file = serializers.PrimaryKeyRelatedField(read_only=True)
    groups = DatabaseGroupReadSerializer(many=True, read_only=True)
    owner = UserSerializer(read_only=True, source="user")
    
    class Meta:
        model = DatabaseTask
        fields = '__all__'
        read_only_fields = ('id', 'status', 'created_at', 'updated_at', 'user', 'database_file', 'groups', 'owner')


class DatabaseTaskCreateSerializer(UserCreatorMixin, serializers.ModelSerializer):
    """Serializer for creating DatabaseTask with groups."""
    
    database_file = serializers.PrimaryKeyRelatedField(
        queryset=File.objects.all(), 
        required=False, 
        allow_null=True
    )
    groups = DatabaseGroupSerializer(many=True, required=False)
    
    class Meta:
        model = DatabaseTask
        fields = '__all__'
        read_only_fields = ('id', 'status', 'created_at', 'updated_at', 'user')
    
    def create(self, validated_data):
        groups_data = validated_data.pop('groups', [])
        task = super().create(validated_data)
        
        # Create associated groups
        for group_data in groups_data:
            group_data['task'] = task
            DatabaseGroup.objects.create(**group_data)
        
        return task
    
    def update(self, instance, validated_data):
        groups_data = validated_data.pop('groups', [])
        task = super().update(instance, validated_data)
        
        # Update associated groups
        if groups_data:
            # Remove existing groups
            instance.groups.all().delete()
            
            # Create new groups
            for group_data in groups_data:
                group_data['task'] = task
                DatabaseGroup.objects.create(**group_data)
        
        return task


class DatabaseTaskStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating DatabaseTask status only."""
    
    class Meta:
        model = DatabaseTask
        fields = ('status', 'celery_task_id')
        read_only_fields = ('id', 'task_name', 'description', 'created_at', 'updated_at', 'user')


class DatabaseGroupStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating DatabaseGroup status and statistics."""
    
    class Meta:
        model = DatabaseGroup
        fields = ('status', 'celery_task_id', 'statistics')
        read_only_fields = ('id', 'name', 'task', 'source', 'config', 'created_at')


class DatabaseTaskSummarySerializer(serializers.ModelSerializer):
    """Summary serializer for DatabaseTask with basic info and group counts."""
    
    groups_count = serializers.SerializerMethodField()
    total_samples = serializers.SerializerMethodField()
    owner = UserSerializer(read_only=True, source="user")
    
    class Meta:
        model = DatabaseTask
        fields = (
            'id', 'task_name', 'description', 'status', 'created_at', 
            'updated_at', 'groups_count', 'total_samples', 'owner'
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'groups_count', 'total_samples', 'owner')
    
    def get_groups_count(self, obj):
        return obj.groups_count
    
    def get_total_samples(self, obj):
        return obj.total_samples


class DatabaseGroupSummarySerializer(serializers.ModelSerializer):
    """Summary serializer for DatabaseGroup with basic info and statistics."""
    
    file_count = serializers.SerializerMethodField()
    label_count = serializers.SerializerMethodField()
    total_samples = serializers.SerializerMethodField()
    owner = UserSerializer(read_only=True, source="task.user")
    
    class Meta:
        model = DatabaseGroup
        fields = (
            'id', 'name', 'task', 'status', 'source', 'created_at',
            'file_count', 'label_count', 'total_samples', 'owner'
        )
        read_only_fields = ('id', 'created_at', 'file_count', 'label_count', 'total_samples', 'owner')
    
    def get_file_count(self, obj):
        return obj.file_count
    
    def get_label_count(self, obj):
        return obj.label_count
    
    def get_total_samples(self, obj):
        return obj.total_samples 