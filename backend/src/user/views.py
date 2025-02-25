from smtplib import SMTPException
from urllib.parse import urlparse

import django_filters
import pkce
from constance import config
from django.conf import settings
from django.contrib.auth.models import Group
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.sites.shortcuts import get_current_site
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.http import HttpResponseRedirect
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django_filters import rest_framework as filters
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import CustomUserSerializer, GroupSerializer, LoginSerializer, UpdateUserProfileSerializer


# A custom token generator for account activation. This class inherits from Django's built-in PasswordResetTokenGenerator.
class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    # Overriding the _make_hash_value method. This method is used internally by Django to create a hashed value for the token.
    # The returned value includes the user's primary key, the current timestamp, and the user's active status.
    def _make_hash_value(self, user, timestamp):
        return (
            str(user.pk) + str(timestamp) + str(user.is_active)
        )


# Creating an instance of the custom token generator.
account_activation_token = AccountActivationTokenGenerator()


# API View for creating a new user. This is a POST endpoint that accepts user data, validates it, creates a new user and sends an activation email.
class CustomUserCreate(APIView):
    # Disable authentication for this endpoint.
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Create a new user account.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['email', 'first_name', 'last_name', 'password'],
            properties={
                'email': openapi.Schema(type=openapi.TYPE_STRING, description='User email address.'),
                'first_name': openapi.Schema(type=openapi.TYPE_STRING, description='User first name.'),
                'last_name': openapi.Schema(type=openapi.TYPE_STRING, description='User last name.'),
                'password': openapi.Schema(type=openapi.TYPE_STRING, description='User password, minimum 8 characters.'),
            },
            example={
                'email': 'test@example.com',
                'first_name': 'dev',
                'last_name': 'test',
                'password': 'password123'
            },
        ),
        responses={
            201: CustomUserSerializer(),
            400: "Bad Request - Invalid input",
            500: "Internal Server Error"
        },
    )


    def post(self, request, format='json'):
        serializer = CustomUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            if user:
                try:
                    self.send_activation_email(user, request)
                except SMTPException:
                    # Return an error response if there's an SMTP error when trying to send the email.
                    return Response({"error": "Unable to send email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                return Response(serializer.data, status=status.HTTP_201_CREATED)
        # If the data is not valid, return an error response with the validation errors.
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Helper method for sending the account activation email. This method is called after a user is created successfully.
    def send_activation_email(self, user, request):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        activation_link = f"http://{get_current_site(request).domain}/api/auth/activate/{uid}/{token}/"

        mail_subject = 'Activate your account.'
        message = f"Hi {user.first_name},\n\nThanks for signing up! To activate your account, click the link below:\n\n{activation_link}\n\nIf you didn't sign up for our website, you can ignore this email.\n\nThanks,\n\nThe Maipl Team"
        send_mail(mail_subject, message, 'admin@maipl-dev.com', [user.email])


# API View for activating a user's account. This is a GET endpoint that accepts a user ID and a token, and activates the user's account if the token is valid.
class ActivateAccount(APIView):
    # Disable authentication for this endpoint.
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Activate a user's account using a provided user ID and token.",
        manual_parameters=[
            openapi.Parameter('uidb64', openapi.IN_PATH, description="Base64 encoded user ID", type=openapi.TYPE_STRING),
            openapi.Parameter('token', openapi.IN_PATH, description="Account activation token", type=openapi.TYPE_STRING),
        ],
        responses={
            302: "Redirect to login URL on successful activation",
            400: "Bad Request - Invalid activation link, user does not exist, or activation link has expired"
        },
    )

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError):
            # If there's an error with the user ID or the token, return an error response.
            return Response({"error": "Invalid activation link!"}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            # If no user exists with the provided ID, return an error response.
            return Response({"error": "User does not exist!"}, status=status.HTTP_400_BAD_REQUEST)
        if not account_activation_token.check_token(user, token):
            # If the token is not valid, return an error response.
            return Response({"error": "Activation link has expired!"}, status=status.HTTP_400_BAD_REQUEST)

        # If the token is valid, activate the user's account and save the user instance.
        user.is_active = True
        user.save()
        login_url = f"{settings.AUTH_FRONTEND_URL}/login"
        return HttpResponseRedirect(login_url)


class LoginView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Verify user credentials and generate authorization code",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'username': openapi.Schema(type=openapi.TYPE_STRING, description='Username of the user'),
                'password': openapi.Schema(type=openapi.TYPE_STRING, description='Password of the user'),
                'challenge': openapi.Schema(type=openapi.TYPE_STRING, description='PKCE challenge'),
                'next': openapi.Schema(type=openapi.TYPE_STRING, description='Next URL to redirect')
            },
            required=['username', 'password', 'challenge', 'next'],
        ),
        responses={
            200: openapi.Schema(type=openapi.TYPE_OBJECT, properties={'code': openapi.Schema(type=openapi.TYPE_STRING)}),
            400: "Bad Request - PKCE challenge or redirect URI is missing, or unauthorized redirect URI",
            401: "Unauthorized - Invalid user credentials",
        },
    )


    def post(self, request, *args, **kwargs):
        # Verify user
        try:
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data
        except ValidationError:
            return Response({"error": "invalid user credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        # Verify challenge
        challenge = request.data.get('challenge')
        if not challenge:
            return Response({"error": "pkce challenge is missing"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify the `next` URL
        next_url = request.data.get('next')
        if not next_url:
            return Response({"error": "redirect uri is missing"}, status=status.HTTP_400_BAD_REQUEST)

        parsed_url = urlparse(next_url)
        allowed_url = config.ALLOWED_REDIRECT_URLS.split(',')

        if parsed_url.netloc not in allowed_url:
            return Response({"error": "Unauthorized redirect URI"}, status=status.HTTP_400_BAD_REQUEST)

        # Generate authorization code
        code = pkce.generate_code_verifier(43)
        cache.set(f"auth:{code}:challenge", challenge, 300)
        cache.set(f"auth:{code}:user", user.pk, 300)

        return Response({"code": code}, status=status.HTTP_200_OK)


class TokenView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Verify the code and generate the token",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'code': openapi.Schema(type=openapi.TYPE_STRING, description='Authorization code'),
                'verifier': openapi.Schema(type=openapi.TYPE_STRING, description='PKCE verifier')
            },
            required=['code', 'verifier'],
        ),
        responses={
            200: openapi.Schema(type=openapi.TYPE_OBJECT, properties={'refresh': openapi.Schema(type=openapi.TYPE_STRING), 'access': openapi.Schema(type=openapi.TYPE_STRING)}),
            400: "Bad Request - Authorization code or PKCE verifier is missing, or authorization code expired or already redeemed, or invalid PKCE verifier",
            401: "Unauthorized - Incorrect PKCE verifier",
            404: "Not Found - User not found"
        },
    )

    def post(self, request, *args, **kwargs):

        # Verify the code
        code = request.data.get('code')
        if not code:
            return Response({"error": "authorization code is missing"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify the user
        user_id = cache.get(f"auth:{code}:user")
        if not user_id:
            return Response({"error": "authorization code expired or already redeemed"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=user_id)
        except ObjectDoesNotExist:
            return Response({"error": "user not found"}, status=status.HTTP_404_NOT_FOUND)

        # Verify the challenge
        verifier = request.data.get('verifier')
        if not verifier:
            return Response({"error": "pkce verifier is missing"}, status=status.HTTP_400_BAD_REQUEST)

        challenge = cache.get(f"auth:{code}:challenge")
        try:
            if not pkce.get_code_challenge(verifier) == challenge:
                return Response({"error": "incorrect pkce verifier"}, status=status.HTTP_401_UNAUTHORIZED)

        except ValueError:
            return Response({"error": "invalid pkce verifier"}, status=status.HTTP_400_BAD_REQUEST)

        # Generate the token
        refresh = RefreshToken.for_user(user)
        tokens = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

        # Delete the code and challenge
        cache.delete(f"auth:{code}:challenge")
        cache.delete(f"auth:{code}:user")

        return Response(tokens, status=status.HTTP_200_OK)
    
class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Generate a new access token using the refresh token",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'refresh': openapi.Schema(type=openapi.TYPE_STRING, description='Refresh token')
            },
            required=['refresh'],
        ),
        responses={
            200: openapi.Schema(type=openapi.TYPE_OBJECT, properties={'access': openapi.Schema(type=openapi.TYPE_STRING)}),
            400: "Bad Request - Refresh token is missing or invalid",
        },
    )

    def post(self, request, *args, **kwargs):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response({"error": "refresh token is missing"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh)
            access = str(refresh.access_token)
        except Exception:
            return Response({"error": "invalid refresh token"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"access": access}, status=status.HTTP_200_OK)


class UserDetail(generics.RetrieveUpdateAPIView):
    # UserDetail view: provides a way to retrieve or update the details of a User instance
    # The User instance is identified by the primary key (id) provided in the URL
    # This view is protected by authentication - only authenticated users can access it
    queryset = User.objects.all()
    serializer_class = CustomUserSerializer

class UserFilter(filters.FilterSet):
    email = django_filters.CharFilter(method='filter_by_email')

    class Meta:
        model = User
        fields = ['first_name', 'last_name']
    
    def filter_by_email(self, queryset, name, value):
        return queryset.filter(email__icontains=value)
    
class UserList(generics.ListAPIView):
    serializer_class = CustomUserSerializer
    filterset_class = UserFilter

    def get_queryset(self):
        user_id = self.request.user.id
        return User.objects.all().filter(is_active=True).exclude(id=user_id)
    

class UserProfile(generics.RetrieveAPIView):
    # UserProfile view: provides a way to retrieve the profile of the currently authenticated user
    # The User instance is directly obtained from the request, no need for id in the URL
    # This view is also protected by authentication - only authenticated users can access it
    serializer_class = CustomUserSerializer

    def get_object(self):
        return User.objects.get(pk=self.request.user.pk)


class GroupList(generics.ListAPIView):
    # GroupList view: provides a way to retrieve a list of all Group instances
    required_scopes = ['groups']
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class UpdateUserProfileView(generics.UpdateAPIView):
    serializer_class = UpdateUserProfileSerializer
    
    def get_object(self):
        # Get the actual User instance from database instead of using TokenUser
        return User.objects.get(id=self.request.user.id)

    @swagger_auto_schema(
        operation_description="Update the current user's profile. To change password, current_password must be provided.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'email': openapi.Schema(type=openapi.TYPE_STRING, description='User email address'),
                'first_name': openapi.Schema(type=openapi.TYPE_STRING, description='User first name'),
                'last_name': openapi.Schema(type=openapi.TYPE_STRING, description='User last name'),
                'password': openapi.Schema(type=openapi.TYPE_STRING, description='New password (min 8 characters)'),
                'current_password': openapi.Schema(type=openapi.TYPE_STRING, description='Current password (required for password change)'),
            },
        ),
        responses={
            200: UpdateUserProfileSerializer(),
            400: "Bad Request - Validation error",
            401: "Unauthorized - Not authenticated",
        },
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
