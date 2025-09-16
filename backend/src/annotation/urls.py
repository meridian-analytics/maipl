from django.urls import path

from .views import (
    AnnotationBatchSegmentView,
    AnnotationDetail,
    AnnotationList,
    AudioListView,
    BatchDetail,
    BatchFileListView,
    BatchSegmentListView,
    BatchList,
    BatchSegmentPreviewView,
    ImageListView,
    ProcessBatchView,
    SegmentDetail,
    SegmentList,
    TaskStatusView,
    BatchAnnotationExportView,
)

app_name = "annotation"

urlpatterns = [
    path("batch/", BatchList.as_view(), name="batch_list"),
    path("batch/<int:pk>/", BatchDetail.as_view(), name="batch_detail"),
    path(
        "batch/<int:batch_id>/files/",
        BatchFileListView.as_view(),
        name="batch_file_list",
    ),
    path(
        "batch/<int:batch_id>/segments/",
        BatchSegmentListView.as_view(),
        name="batch_segment_list",
    ),
    path(
        "batch/preview/",
        BatchSegmentPreviewView.as_view(),
        name="batch_segment_preview",
    ),
    path("segment/", SegmentList.as_view(), name="segment_list"),
    path("segment/<int:pk>/", SegmentDetail.as_view(), name="segment_detail"),
    path("annotation/", AnnotationList.as_view(), name="annotation_list"),
    path("annotation/<int:pk>/", AnnotationDetail.as_view(),
         name="annotation_detail"),
    path(
        "annotation/batch/<int:batch_id>/segment/<int:segment_id>/",
        AnnotationBatchSegmentView.as_view(),
        name="annotation_batch_segment",
    ),
    path("image/", ImageListView.as_view(), name="image_list"),
    path("audio/", AudioListView.as_view(), name="audio_list"),
    path("process/", ProcessBatchView.as_view(), name="process_batch"),
    path("task_status/<str:task_id>/",
         TaskStatusView.as_view(), name="task_status"),
    path(
        "batch/export/",
        BatchAnnotationExportView.as_view(),
        name="batch_annotation_export",
    ),
]
