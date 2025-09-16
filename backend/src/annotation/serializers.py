from rest_framework import serializers

from common.shared_mixins import CreatorMixin
from file.models import File
from user.models import User
from user.serializers import UserSerializer

from .models import (
    Annotation,
    Batch,
    ProcessedAudio,
    ProcessedImage,
    Segment,
    UserRoleBatch,
)


class AnnotationSerializer(CreatorMixin, serializers.ModelSerializer):

    class Meta:
        model = Annotation
        fields = '__all__'

    extra_kwargs = {'batch': {'required': False}}


class BatchWriteSerializer(CreatorMixin, serializers.ModelSerializer):
    filelist = serializers.PrimaryKeyRelatedField(queryset=File.objects.all(), many=True, required=False)
    segments = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    shared_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, required=False)

    class Meta:
        model = Batch
        ordering = ['id']
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_id']


class UserWithRoleSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]

    def to_representation(self, instance):
        user_representation = super().to_representation(instance)
        batch_id = self.context.get("batch_id")

        try:
            user_role_batch = UserRoleBatch.objects.get(
                user=instance.id, batch=batch_id
            )
            role_code = user_role_batch.role.code
        except UserRoleBatch.DoesNotExist:
            role_code = 0

        return {"user": user_representation, "role_code": role_code}

class CurrentUserRoleBatchSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='role.name')
    code = serializers.CharField(source='role.code')

    class Meta:
        model = UserRoleBatch
        fields = ['name', 'code']


class BatchReadSerializer(serializers.ModelSerializer):
    task_status = serializers.SerializerMethodField()
    filelist = serializers.PrimaryKeyRelatedField(queryset=File.objects.all(), many=True, required=False)
    segments = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    shared_to = UserWithRoleSerializer(many=True, read_only=True)
    owner = UserSerializer(read_only=True, source="user_id")
    role = CurrentUserRoleBatchSerializer(read_only=True)

    class Meta:
        model = Batch
        ordering = ['id']
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_id']

    def get_task_status(self, obj):
        return obj.task_status()

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["shared_to"] = [
            [data["user"], data["role_code"]]
            for data in [
                UserWithRoleSerializer(user, context={"batch_id": instance.id}).data
                for user in instance.shared_to.all()
            ]
        ]
        try:
            user_role_batch = UserRoleBatch.objects.get(
                user=self.context["user_id"], batch=instance.id
            )
            representation["role"] = CurrentUserRoleBatchSerializer(user_role_batch).data
        except UserRoleBatch.DoesNotExist:
            representation["role"] = None
        return representation


class SegmentSerializer(CreatorMixin, serializers.ModelSerializer):

    file = serializers.PrimaryKeyRelatedField(queryset=File.objects.all())
    batch = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all(), required=False)

    class Meta:
        ordering = ['id']
        model = Segment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_id']


class ImageSerializer(serializers.ModelSerializer):

    class Meta:

        model = ProcessedImage
        fields = '__all__'


class AudioSerializer(serializers.ModelSerializer):

    class Meta:

        model = ProcessedAudio
        fields = '__all__'


class TaskResponseSerializer(serializers.Serializer):
    task_id = serializers.CharField()
    status = serializers.CharField()
