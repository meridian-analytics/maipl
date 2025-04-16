import hashlib

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from common.shared_mixins import CreatorMixin
from user.serializers import UserSerializer

from .models import File

User = get_user_model()


class ReadSerializer(serializers.ModelSerializer):

    shared_to = UserSerializer(many=True, read_only=True)
    owner = UserSerializer(read_only=True, source="user_id")

    class Meta:
        model = File
        fields = [
            "id",
            "basename",
            "created_at",
            "dirname",
            "extname",
            "file",
            "maipl_folder",
            "meta",
            "path",
            "sha256",
            "size",
            "tag",
            "updated_at",
            "user_id",
            'shared_to',
            'owner',
            'in_use',
        ]
        extra_kwargs = {field: {"read_only": True} for field in fields}


class UpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = [
            "maipl_folder",
            "meta",
            "path",
            "tag",
            "file",
            "sha256",
        ]

    def validate(self, data):
        file = data.get("file", None)
        sha256 = data.get("sha256", None)
        path = data.get("path", None)

        # Check if path is being updated without file and sha256
        if path and (not file or not sha256):
            raise serializers.ValidationError(
                "When updating path, both file and sha256 must be provided."
            )

        # Existing validations
        if bool(file) != bool(sha256):
            raise serializers.ValidationError("Both file and sha256 must be provided")

        if file:
            if hashlib.sha256(file.read()).hexdigest() != sha256:
                raise serializers.ValidationError("File integrity check failed.")
            file.seek(0)

        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        if "file" in validated_data and "sha256" in validated_data:
            instance.file.delete()
            instance.file = validated_data.get("file", instance.file)
            instance.sha256 = validated_data.get("sha256", instance.sha256)
            instance.path = validated_data.get("path", instance.path)

        instance.maipl_folder = validated_data.get(
            "maipl_folder", instance.maipl_folder
        )
        instance.meta = validated_data.get("meta", instance.meta)
        instance.tag = validated_data.get("tag", instance.tag)
        instance.save()

        return instance


class CreateSerializer(CreatorMixin, serializers.ModelSerializer):
    class Meta:
        model = File
        fields = [
            "id",
            "basename",
            "created_at",
            "dirname",
            "extname",
            "file",
            "maipl_folder",
            "meta",
            "path",
            "sha256",
            "size",
            "tag",
            "updated_at",
            "user_id",
        ]
        read_only_fields = [
            "id",
            "basename",
            "created_at",
            "dirname",
            "extname",
            "size",
            "updated_at",
            "user_id",
        ]

    def validate_sha256(self, sha256):
        file = self.initial_data["file"]
        if not file:
            raise serializers.ValidationError(
                "File integrity check source file not found."
            )
        if hashlib.sha256(file.read()).hexdigest() != sha256:
            raise serializers.ValidationError("File integrity check failed.")
        # file.read() moves the cursor to the end of the file, so we need to reset it
        file.seek(0)
        return sha256


class FileChangeSerializer(serializers.Serializer):
    file = serializers.IntegerField()
    changes = serializers.ListField()
