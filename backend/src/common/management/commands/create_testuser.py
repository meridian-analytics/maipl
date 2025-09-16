import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """
    Seed database
    """

    help = "Create a list of test users"

    def handle(self, *args, **kwargs):
        """
        Create a superuser with the following environment variables:
        """
        User = get_user_model()
        for i in range(1, 6):
            first_name = f"testuser{i}"
            last_name = f"testuser{i}"
            email = f"testuser{i}@test.com"
            password = os.environ.get("TEST_USER_PASSWORD", "asdf.com")

            user_id = User.objects.filter(email=email)
            if user_id:
                self.stdout.write(self.style.ERROR("User already exists"))
            else:
                User.objects.create_user(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    password=password,
                    is_active=True,
                    is_staff=False,
                    is_superuser=False,
                )
                self.stdout.write(
                    self.style.SUCCESS(f"User: {email} created successfully")
                )
