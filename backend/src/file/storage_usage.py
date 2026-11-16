from django.db.models import BigIntegerField, Count, Sum, Value
from django.db.models.functions import Coalesce

from .models import File


def get_storage_usage(user_id):
    """Return storage owned by a user, excluding files merely shared with them."""
    files = File.objects.filter(user_id=user_id)
    zero_bytes = Value(0, output_field=BigIntegerField())

    totals = files.aggregate(
        used_bytes=Coalesce(
            Sum("size", output_field=BigIntegerField()),
            zero_bytes,
        ),
        file_count=Count("id"),
    )
    by_folder = list(
        files.values("maipl_folder")
        .annotate(
            used_bytes=Coalesce(
                Sum("size", output_field=BigIntegerField()),
                zero_bytes,
            ),
            file_count=Count("id"),
        )
        .order_by("maipl_folder")
    )

    return {
        **totals,
        # These fields establish a stable API contract for a future quota feature.
        "quota_bytes": None,
        "remaining_bytes": None,
        "usage_percent": None,
        "by_folder": by_folder,
    }
