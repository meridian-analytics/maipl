import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """
    Seed database
    """

    help = "Create a superuser"

    def handle(self, *args, **kwargs):
        """
        Create a superuser with the following environment variables:
        """
        User = get_user_model()
        first_name = os.environ.get("ADMIN_FIRST_NAME", "admin")
        last_name = os.environ.get("ADMIN_LAST_NAME", "admin")
        email = os.environ.get("ADMIN_EMAIL", "admin@dal.ca")
        password = os.environ.get("ADMIN_PASSWORD", "admin")

        if User.objects.count() == 0:
            User.objects.create_superuser(
                first_name=first_name,
                last_name=last_name,
                email=email,
                password=password,
            )
            self.stdout.write(
                self.style.SUCCESS(f"Superuser: {email} created successfully")
            )
        else:
            self.stdout.write(self.style.ERROR("Database is not empty."))
