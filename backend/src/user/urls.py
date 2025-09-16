from django.urls import path

from .views import (ActivateAccount, CustomUserCreate, GroupList, LoginView,
                    RefreshTokenView, TokenView, UserDetail, UserList,
                    UserProfile, UpdateUserProfileView)

app_name = 'user'

urlpatterns = [
    path('auth/register/', CustomUserCreate.as_view(), name='register'),
    path('auth/activate/<uidb64>/<token>/', ActivateAccount.as_view(), name='activate'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/token/', TokenView.as_view(), name='token'),
    path('auth/token/refresh/', RefreshTokenView.as_view(), name='refresh_token'),
    path('user/<int:pk>/', UserDetail.as_view(), name='user'),
    path('user/', UserList.as_view(), name='users'),
    path('user/profile/', UserProfile.as_view(), name='profile'),
    path('user/profile/update/', UpdateUserProfileView.as_view(), name='profile-update'),
    path('user/groups/', GroupList.as_view(), name='groups'),
]
