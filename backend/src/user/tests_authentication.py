from django.test import SimpleTestCase

from .views import (
    ActivateAccount,
    CustomUserCreate,
    LoginView,
    RefreshTokenView,
    TokenView,
)


class PublicAuthenticationEndpointTests(SimpleTestCase):
    def test_public_authentication_endpoints_do_not_use_session_authentication(self):
        views = (
            CustomUserCreate,
            ActivateAccount,
            LoginView,
            TokenView,
            RefreshTokenView,
        )

        for view in views:
            with self.subTest(view=view.__name__):
                self.assertEqual(view.authentication_classes, [])
