import csv
from collections import defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from common.file_utils import FileUtils

from .models import MetricsTask
from .serializers import MetricSerializer, MetricsReadSerializer


class CustomRateThrottle(UserRateThrottle):
    rate = "5/minute"


class UserMixin:
    @property
    def user(self):
        if not hasattr(self, "_user"):
            User = get_user_model()
            self._user = get_object_or_404(User, id=self.request.user.id)
        return self._user


class MetricsTaskListCreateView(UserMixin, generics.ListCreateAPIView):
    """
    List all metrics tasks or create a new metrics task
    """

    serializer_class = MetricSerializer
    filterset_fields = ("status", "created_at", "updated_at")
    ordering_fields = ["created_at"]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return MetricsReadSerializer
        return MetricSerializer

    def get_queryset(self):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        return MetricsTask.objects.filter(
            user=self.user, created_at__gte=thirty_days_ago
        )

    def perform_create(self, serializer):
        serializer.save(user=self.user)

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            metrics_task = MetricsTask.objects.get(id=response.data["id"])
            try:
                metrics_task.start()
            except Exception as e:
                metrics_task.delete()
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        return response

    def get_throttles(self):
        """
        Override this method to apply throttling only to POST requests.
        """
        if self.request.method == "POST":
            self.throttle_classes = [CustomRateThrottle]
        else:
            self.throttle_classes = []
        return super().get_throttles()


class MetricsTaskDetailView(UserMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a metrics task
    """

    serializer_class = MetricSerializer

    def get_queryset(self):
        return MetricsTask.objects.filter(user=self.user)


class MetricsFilesView(generics.GenericAPIView):
    """
    Download and convert metrics csv files to json
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.file_utils = FileUtils()

    def get(self, request):
        file_ids = request.query_params.get("file_ids", "").split(",")
        files = [[file_id, self.file_utils.download_file(file_id)] for file_id in file_ids]
        response = {}

        for item in files:
            file_id, file_path = item
            if file_path:
                try:
                    with open(file_path, "r", encoding="utf-8") as file:
                        reader = csv.DictReader(file)
                        file_metrics = defaultdict(list)
                        for row in reader:
                            class_name = row["class"]
                            file_metrics[class_name].append(
                                {
                                    "threshold": float(row["threshold"]),
                                    "Precision": float(row["Precision"]),
                                    "Recall": float(row["Recall"]),
                                    "F1-Score": float(row["F1-Score"]),
                                    "FPR_per_time_unit": float(
                                        row["FPR_per_time_unit"]
                                    ),
                                }
                            )
                        response[file_id] = [
                            {"class": k, "metrics": v} for k, v in file_metrics.items()
                        ]
                except Exception as e:
                    return Response(
                        {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                return Response(
                    {"error": f"File with id {file_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response(response)
