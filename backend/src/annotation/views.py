import json
import os
import csv
from datetime import datetime
from django.conf import settings

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import MaiplPagination
from common.shared_mixins import CreateListModelMixin, DeleteByIdsMixin
from common.sorting import SortableMixin
from file.serializers import ReadSerializer
from common.file_utils import FileUtils

from .handlers import BatchCreateHandler, BatchPreviewHandler
from .models import (
    Annotation,
    Batch,
    ProcessedAudio,
    ProcessedImage,
    Segment,
    UserRoleBatch,
    File,
)
from .permissions import AnnotationPermission, UserCan
from .serializers import (
    AnnotationSerializer,
    AudioSerializer,
    BatchReadSerializer,
    BatchWriteSerializer,
    ImageSerializer,
    SegmentSerializer,
)
from .swagger_decorators import (
    annotation_batch_segment_view_schema,
    process_batch_view_schema,
    task_status_view_schema,
)
from .tasks import process_batch
from .handlers.batch_annotation_export import BatchAnnotationExportHandler


class ImageListView(DeleteByIdsMixin, generics.ListCreateAPIView):
    queryset = ProcessedImage.objects.all()
    serializer_class = ImageSerializer
    filterset_fields = ["user_id", "batch_id", "segment_id"]


class AudioListView(DeleteByIdsMixin, generics.ListCreateAPIView):
    queryset = ProcessedAudio.objects.all()
    serializer_class = AudioSerializer
    filterset_fields = ["user_id", "batch_id", "segment_id"]


class ProcessBatchView(APIView):

    @process_batch_view_schema("post")
    def post(self, request):
        batch_id = request.data.get("batch_id")

        if not batch_id:
            return Response(
                {"error": "batch_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            task = process_batch.delay(batch_id)
            # update task id in batch
            batch = Batch.objects.get(id=batch_id)
            batch.task_id = task.id
            batch.save()
            return Response(
                {"task_id": task.id, "message": "Your request has been processed."},
                status=status.HTTP_202_ACCEPTED,
            )
        except Exception as e:
            return Response(
                "An error occurred while starting the task.",
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TaskStatusView(APIView):

    @task_status_view_schema("get")
    def get(self, request, task_id, *args, **kwargs):
        task = process_batch.AsyncResult(task_id)
        response_data = {"task_id": task_id, "status": task.status}
        return Response(response_data, status=status.HTTP_200_OK)


class BatchAnnotationExportView(APIView):
    """API endpoint to export batch annotations to CSV.
    
    Exports annotations with the following fields:
    - start (x in region)
    - end (x + width in region)
    - freq_min (y in region)
    - freq_max (y + height in region)
    - duration (width in region)
    - filename
    - label
    - call_type
    - quality
    - comments
    
    The exported file is saved in the File model under the 'annotation' folder
    and can be queried later using the file_id.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.file_utils = FileUtils()

    def post(self, request):
        batch_id = request.data.get('batch_id')
        if not batch_id:
            return Response(
                {"error": "batch_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        handler = BatchAnnotationExportHandler(request.user, batch_id, self.file_utils)
        return handler.handle()


class AnnotationBatchSegmentView(APIView):
    permission_classes = [AnnotationPermission]

    """
    A view to handle PUT request for a specific batch and segment.
    The request and response body should be a list of annotations with their ids.
    The batch and segment id will be taken from the url.
    For each annotation in the request body, the following will be done:
    1. look up the annotation in the database with the given id
    2. if the annotation exists, update it with the new data
    3. if the annotation does not exist, create a new one with the given data
    """

    @annotation_batch_segment_view_schema("put")
    def put(self, request, batch_id, segment_id, *args, **kwargs):
        annotations = request.data

        if not isinstance(annotations, list):
            return Response(
                {"detail": "Expected a list of annotations."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_user_model().objects.get(id=request.user.id)
        batch = Batch.objects.get(id=batch_id)

        # Collect all annotation IDs from the request
        annotation_ids = [
            annotation.get("id") for annotation in annotations if "id" in annotation
        ]

        # Fetch all existing annotations in one query
        existing_annotations = Annotation.objects.filter(id__in=annotation_ids)
        existing_annotations_map = {
            annotation.id: annotation for annotation in existing_annotations
        }

        response_data = []

        # Begin a transaction
        with transaction.atomic():
            for annotation in annotations:
                # Ensure all required keys are present
                required_keys = ["id", "region", "created_at"]
                if not all(key in annotation for key in required_keys):
                    raise ValidationError(
                        "Missing required keys in annotation.")

                annotation_id = annotation["id"]
                annotation_obj = existing_annotations_map.get(annotation_id)

                if annotation_obj:
                    # Update the existing annotation
                    # check if the user has permission to edit the annotation
                    if UserCan.edit_all_annotations(user, batch):
                        annotation_obj.region = annotation["region"]
                        annotation_obj.created_at = annotation["created_at"]
                    elif UserCan.edit_annotation(user, batch):
                        if annotation_obj.user_id.id == user.id:
                            annotation_obj.region = annotation["region"]
                            annotation_obj.created_at = annotation["created_at"]

                else:
                    # Create a new annotation
                    segment = Segment.objects.get(id=segment_id)
                    batch = Batch.objects.get(id=batch_id)
                    file = segment.file

                    annotation_obj = Annotation(
                        id=annotation_id,
                        segment=segment,
                        batch=batch,
                        file=file,
                        region=annotation["region"],
                        user_id=user,
                        created_at=annotation["created_at"],
                    )

                # Save the annotation (either updated or new)
                annotation_obj.save()
                response_data.append(AnnotationSerializer(annotation_obj).data)

            # delete annotations that were not in the request but were in the database
            annotations_to_delete = Annotation.objects.filter(
                batch_id=batch_id, segment_id=segment_id
            ).exclude(id__in=annotation_ids)
            for annotation in annotations_to_delete:
                if UserCan.delete_all_annotations(user, batch):
                    annotation.delete()
                elif UserCan.delete_annotation(user, batch):
                    if annotation.user_id.id == user.id:
                        annotation.delete()

        return Response(response_data, status=status.HTTP_200_OK)

    @annotation_batch_segment_view_schema("get")
    def get(self, request, batch_id, segment_id, *args, **kwargs):
        user = get_user_model().objects.get(id=request.user.id)
        batch = Batch.objects.get(id=batch_id)
        if UserCan.view_all_annotations(user, batch):
            annotations = Annotation.objects.filter(
                batch_id=batch_id, segment_id=segment_id
            )
            serializer = AnnotationSerializer(annotations, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif UserCan.view_annotation(user, batch):
            annotations = Annotation.objects.filter(
                batch_id=batch_id, segment_id=segment_id, user_id=user
            )
            serializer = AnnotationSerializer(annotations, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(
                status=status.HTTP_403_FORBIDDEN,
                data={"error": "You are not allowed to view annotations"},
            )


class AnnotationDetail(generics.RetrieveUpdateDestroyAPIView):
    """
    A view to handle GET, PUT and DELETE requests for a specific annotation.
    """
    queryset = Annotation.objects.all()
    serializer_class = AnnotationSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        user = self.request.user
        annotation = self.get_object()
        batch = annotation.batch

        if UserCan.view_all_annotations(user, batch):
            return Annotation.objects.all()
        elif UserCan.view_annotation(user, batch):
            return Annotation.objects.filter(user_id=user)
        return Annotation.objects.none()

    def update(self, request, *args, **kwargs):
        """Handle PUT/PATCH requests with permission checks."""
        user = request.user
        annotation = self.get_object()
        batch = annotation.batch

        if UserCan.edit_all_annotations(user, batch):
            return super().update(request, *args, **kwargs)
        elif UserCan.edit_annotation(user, batch) and annotation.user_id == user:
            return super().update(request, *args, **kwargs)
        return Response(
            {"error": "You don't have permission to edit this annotation"},
            status=status.HTTP_403_FORBIDDEN
        )

    def destroy(self, request, *args, **kwargs):
        """Handle DELETE requests with permission checks."""
        user = request.user
        annotation = self.get_object()
        batch = annotation.batch

        if UserCan.delete_all_annotations(user, batch):
            return super().destroy(request, *args, **kwargs)
        elif UserCan.delete_annotation(user, batch) and annotation.user_id == user:
            return super().destroy(request, *args, **kwargs)
        return Response(
            {"error": "You don't have permission to delete this annotation"},
            status=status.HTTP_403_FORBIDDEN
        )


class BatchList(generics.ListCreateAPIView):
    """
    A view to handle GET and POST requests for batches
    """
    pagination_class = MaiplPagination
    filterset_fields = {
        "id": ["in", "exact"],
        "batch_name": ["contains"],
    }

    def get_serializer(self, *args, **kwargs):
        kwargs["context"] = self.get_serializer_context()
        kwargs["context"]["user_id"] = self.request.user.id
        if self.request.method == "GET":
            return BatchReadSerializer(*args, **kwargs)
        return BatchWriteSerializer(*args, **kwargs)

    def get_queryset(self):
        """
        This view should return a list of all the batches
        """
        user_id = self.request.user.id
        shared = self.request.query_params.get("shared", "all")
        if shared == "true":
            return Batch.objects.filter(shared_to__exact=user_id).order_by("-id")
        elif shared == "false":
            return Batch.objects.filter(user_id=user_id).order_by("-id")
        else:
            return (
                Batch.objects.filter(Q(user_id=user_id) |
                                    Q(shared_to__exact=user_id))
                .order_by("-id")
                .distinct()
            )

    def post(self, request, *args, **kwargs):
        """
        Handle POST request to create a new batch in two scenarios:
        1. Create a new batch with a list of files.
        2. Create a new batch without files but with the given import_file id.
        """
        required_fields = ["filename", "start", "end", "label"]

        data = BatchCreateHandler(request, required_fields)
        config = data.get_annotation_config()
        request.data["annotation_file_text"] = json.dumps(config)

        if data.get_import_file_id():
            try:
                with transaction.atomic():
                    request.data["filelist"] = data.get_filelist()
                    response = super().post(request, *args, **kwargs)
                    data.set_batch_id(response.data["id"])

                    data.generate_segments_with_filelist()
                    response.data["segments"] = data.get_segment_ids()
                    data.import_annotations_to_batch()
                    return response
            except (ValueError, Exception) as e:
                return Response(
                    {
                        "error": "Error happened during File importing or batch creation. "
                        + str(e)
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            try:
                with transaction.atomic():
                    response = super().post(request, *args, **kwargs)
                    data.set_batch_id(response.data["id"])
                    data.generate_segments_with_filelist()
                    response.data["segments"] = data.get_segment_ids()
                    return response
            except Exception as e:
                return Response(
                    {
                        "error": "Exception of type {} happened during batch creation. {}".format(
                            type(e).__name__, str(e)
                        )
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )


class BatchDetail(generics.RetrieveUpdateDestroyAPIView):
    """
    A view to handle GET, PUT and DELETE requests for a specific batch
    """

    def get_serializer(self, *args, **kwargs):
        kwargs["context"] = self.get_serializer_context()
        kwargs["context"]["user_id"] = self.request.user.id
        if self.request.method == "GET":
            return BatchReadSerializer(*args, **kwargs)
        return BatchWriteSerializer(*args, **kwargs)

    def get_queryset(self):
        """
        This view should return a list of all the batches
        """
        user_id = self.request.user.id
        return Batch.objects.filter(
            Q(user_id=user_id) | Q(shared_to__exact=user_id)
        ).distinct()

    def delete(self, request, *args, **kwargs):
        batch_id = self.kwargs["pk"]
        batch = Batch.objects.get(id=batch_id)
        # only the owner of the batch can delete it
        if batch.user_id.id != request.user.id:
            return Response(
                status=status.HTTP_403_FORBIDDEN,
                data={"error": "You are not allowed to delete this batch"},
            )
        return super().delete(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        batch_id = self.kwargs["pk"]
        batch = Batch.objects.get(id=batch_id)
        user = get_user_model().objects.get(id=request.user.id)

        # check if the user has permission to edit or share the batch
        if request.user.id == batch.user_id.id:
            # check if the share_to field is in the request
            if "shared_to" in request.data:
                shared_to = request.data["shared_to"]
                for change in shared_to:
                    batch.share_batch(user, change)
                batch = Batch.objects.get(id=batch_id)
                return Response(
                    status=status.HTTP_200_OK,
                    data=BatchReadSerializer(
                        batch, context={"user_id": request.user.id}
                    ).data,
                )
            else:
                return super().patch(request, *args, **kwargs)
        else:
            return Response(
                status=status.HTTP_403_FORBIDDEN,
                data={"error": "You are not allowed to edit this batch"},
            )


class BatchFileListView(generics.ListAPIView):
    """
    A view to handle GET requests for files in a batch
    """
    serializer_class = ReadSerializer

    def get_queryset(self):
        """
        This view should return a list of all the files in the batch
        """
        batch_id = self.kwargs["batch_id"]
        return Batch.objects.get(id=batch_id).filelist.all()


class BatchSegmentListView(generics.ListAPIView):
    """
    A view to handle GET requests for segments in a batch
    """
    serializer_class = SegmentSerializer

    def get_queryset(self):
        """
        This view should return a list of all the segments in the batch
        """
        batch_id = self.kwargs["batch_id"]
        return Segment.objects.filter(batch_id=batch_id)


class BatchSegmentPreviewView(APIView):
    """
    A view to handle POST request for segment preview
    """

    def post(self, request, *args, **kwargs):
        required_fields = ["filename", "start", "end", "label"]
        data = BatchPreviewHandler(request, required_fields)
        data.generate_preview()
        image_path = data.get_preview_url()
        if not os.path.exists(image_path):
            return Response(
                {"error": "Image not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Return the image file as a response
        response = FileResponse(open(image_path, 'rb'),
                                content_type='image/png')
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(image_path)}"'
        return response


class SegmentList(
    CreateListModelMixin, SortableMixin, DeleteByIdsMixin, generics.ListCreateAPIView
):
    """
    A view to handle GET and POST requests for segments
    """
    pagination_class = MaiplPagination
    queryset = Segment.objects.all()
    serializer_class = SegmentSerializer
    filterset_fields = {
        "id": ["in", "exact"],
        "filename": ["contains"],
        "tag": ["contains"],
        "user_id": ["exact"],
    }
    sort_map = {
        "id": "id",
        "filename": "filename",
        "start": "start",
    }
    default_sort_field = "filename,start"


class SegmentDetail(generics.RetrieveUpdateDestroyAPIView):
    """
    A view to handle GET, PUT and DELETE requests for a specific segment
    """
    queryset = Segment.objects.all()
    serializer_class = SegmentSerializer


class AnnotationList(
    CreateListModelMixin, DeleteByIdsMixin, generics.ListCreateAPIView
):
    """
    A view to handle GET and POST requests for annotations
    """
    pagination_class = MaiplPagination
    serializer_class = AnnotationSerializer
    queryset = Annotation.objects.all()
    filterset_fields = {
        "id": ["in", "exact"],
        "segment": ["exact"],
        "batch": ["in", "exact"],
        "file": ["exact"],
    }

    def get_queryset(self):
        """
        This view should return a list of all the annotations
        """
        user_id = self.request.user.id
        batch_id = self.request.query_params.get("batch")
        user = get_user_model().objects.get(id=user_id)
        batch = Batch.objects.get(id=batch_id)

        if UserCan.view_all_annotations(user, batch):
            return Annotation.objects.filter(batch_id=batch_id)
        elif UserCan.view_annotation(user, batch):
            return Annotation.objects.filter(batch_id=batch_id, user_id=user)
