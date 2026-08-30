import os

from constance import config
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from annotation.models import Permission, Role


class Command(BaseCommand):
    help = "Verify MAIPL seed data and create or update the initial administrator"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-admin-password",
            action="store_true",
            help="Reset the password when the configured administrator already exists",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self._verify_seed_data()
        self._verify_constance()
        self._bootstrap_admin(options["reset_admin_password"])
        self.stdout.write(self.style.SUCCESS("MAIPL bootstrap completed"))

    def _verify_seed_data(self):
        expected_groups = {"admin", "user", "guest"}
        expected_roles = {
            1: "Viewer",
            2: "Contributor",
            3: "Viewer-Contributor",
            4: "Manager",
        }
        expected_permissions = {
            "view_annotations_all",
            "edit_annotations_all",
            "delete_annotations_all",
            "view_annotation",
            "edit_annotation",
            "delete_annotation",
        }

        missing_groups = expected_groups - set(
            Group.objects.filter(name__in=expected_groups).values_list("name", flat=True)
        )
        roles = dict(Role.objects.values_list("code", "name"))
        missing_roles = {
            code: name for code, name in expected_roles.items() if roles.get(code) != name
        }
        missing_permissions = expected_permissions - set(
            Permission.objects.filter(name__in=expected_permissions).values_list(
                "name", flat=True
            )
        )

        if missing_groups or missing_roles or missing_permissions:
            raise CommandError(
                "Required seed data is missing. Run `python manage.py migrate` first. "
                f"groups={sorted(missing_groups)}, roles={missing_roles}, "
                f"permissions={sorted(missing_permissions)}"
            )
        self.stdout.write("Database roles, groups, and permissions are present")

    def _verify_constance(self):
        # Reading these values verifies that the database-backed Constance
        # configuration is available. Defaults are defined in api/settings.py;
        # operators can override them later in Django Admin.
        config.ALLOWED_REDIRECT_URLS
        config.ANNOTATION_CONTENT_TYPE
        config.RAW_CONTENT_TYPE
        self.stdout.write("Django Constance configuration is available")

    def _bootstrap_admin(self, reset_password):
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")
        if not email or not password:
            raise CommandError("ADMIN_EMAIL and ADMIN_PASSWORD must be configured")

        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": os.environ.get("ADMIN_FIRST_NAME", "Admin"),
                "last_name": os.environ.get("ADMIN_LAST_NAME", "User"),
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        update_fields = []
        for field in ("is_active", "is_staff", "is_superuser"):
            if not getattr(user, field):
                setattr(user, field, True)
                update_fields.append(field)
        if created or reset_password:
            user.set_password(password)
            update_fields.append("password")
        if update_fields:
            user.save(update_fields=update_fields)

        action = "created" if created else "verified"
        if reset_password and not created:
            action = "updated and password reset"
        self.stdout.write(f"Administrator {email} {action}")
