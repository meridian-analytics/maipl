from django.urls import path

from .views import (DetectionDetailView,
                    DetectionListExportView, DetectionListExportToFileView, DetectionListView,
                    ModelRunnerTaskListView, ModelRunnerTaskView)

app_name = 'runner'

urlpatterns = [
    path('tasks/', ModelRunnerTaskListView.as_view(), name='run_model_task_list'),
    path('tasks/<int:pk>/', ModelRunnerTaskView.as_view(),
         name='run_model_task_detail'),
    path('tasks/<int:pk>/console/', ModelRunnerTaskView.as_view(),
         name='run_model_task_console'),
    path('tasks/<int:pk>/log/', ModelRunnerTaskView.as_view(),
         name='run_model_task_log'),
    path('detections/export/', DetectionListExportView.as_view(),
         name='detection_list_export'),
    path('detections/export-to-file/', DetectionListExportToFileView.as_view(),
         name='detection_list_export_to_file'),
    path('detections/<int:pk>/', DetectionDetailView.as_view(),
         name='detection_detail'),
    path('detections/', DetectionListView.as_view(), name='detection_list'),
]
