from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from rest_framework import serializers

from user.models import User


class CustomUserSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    password = serializers.CharField(min_length=8, write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'password' ,'is_active', 'is_staff', 'is_superuser', 'is_demo')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(min_length=8, write_only=True)

    class Meta:
        model = User
        fields = ('email', 'password')

    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Incorrect Credentials")


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ("name", )

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name',)


class UpdateUserProfileSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(min_length=8, write_only=True, required=False)
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password', 'current_password')
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, data):
        # If password is being changed, current_password must be provided and valid
        if 'password' in data and not data.get('current_password'):
            raise serializers.ValidationError(
                {"current_password": "Current password is required to change password."}
            )
        
        if 'password' in data and data.get('current_password'):
            # Get the actual user from database instead of using TokenUser
            user = User.objects.get(id=self.context['request'].user.id)
            if not user.check_password(data.get('current_password')):
                raise serializers.ValidationError(
                    {"current_password": "Current password is incorrect."}
                )
        
        # Remove current_password from the data that will be saved
        if 'current_password' in data:
            data.pop('current_password')
            
        return data

    def update(self, instance, validated_data):
        # Get the actual user from database instead of using TokenUser
        instance = User.objects.get(id=instance.id)
        
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password is not None:
            instance.set_password(password)
            
        instance.save()
        return instance

