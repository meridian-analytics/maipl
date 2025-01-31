from django.urls import path

from .views import MetricsTaskListCreateView, MetricsTaskDetailView, MetricsFilesView

app_name = "metrics"

urlpatterns = [
    path("tasks/", MetricsTaskListCreateView.as_view(), name="metrics_task_list"),
    path(
        "tasks/<int:pk>/", MetricsTaskDetailView.as_view(), name="metrics_task_detail"
    ),
    path("files/", MetricsFilesView.as_view(), name="metrics_files"),
]
