import django_filters
from django.db.models import Q
from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError, APIException
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
import django.db

from common.pagination import MaiplPagination
from common.shared_mixins import CreateListModelMixin

from .handlers.uploadValidationHandler import UploadValidationHandler
from .models import File
from .serializers import (
    CreateSerializer,
    FileChangeSerializer,
    ReadSerializer,
    UpdateSerializer,
)
from .swagger_decorators import file_detail_view_schema, set_file_shared_view_schema, file_list_view_schema
from .utils.folder_utils import get_direct_subfolders, get_files_in_folder


class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Resource already exists"


class FileFilter(filters.FilterSet):
    ids = django_filters.CharFilter(method="filter_by_ids")
    path = django_filters.CharFilter(method="filter_by_path")
    path_prefix = django_filters.CharFilter(method="filter_by_path_prefix")
    tag = django_filters.CharFilter(method="filter_by_tag")

    class Meta:
        model = File
        fields = {
            "maipl_folder": ["exact"],
        }

    def filter_by_ids(self, queryset, _, value):
        ids = [int(id) for id in value.split(",")]
        return queryset.filter(id__in=ids)

    def filter_by_path(self, queryset, _, value):
        # Keep existing icontains for backward compatibility (search functionality)
        return queryset.filter(path__icontains=value)

    def filter_by_path_prefix(self, queryset, _, value):
        # Exact folder matching using startswith
        if value:
            prefix = value.rstrip("/") + "/"
            return queryset.filter(path__startswith=prefix)
        return queryset

    def filter_by_tag(self, queryset, _, value):
        return queryset.filter(tag__icontains=value)


class IsResourceOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        # here we are checking if the user is the owner of the resource
        # we are comparing the obj.user_id.id not obj.user_id with the request.user.id
        # because obj.user_id is a User object, not an id
        return obj.user_id.id == request.user.id


class CanViewFile(BasePermission):
    def has_object_permission(self, request, view, obj):
        # users can view a file if they are its owner or the file has been shared with them
        return (
            obj.user_id.id == request.user.id
            or obj.shared_to.filter(id=request.user.id).exists()
        )


class FileDetailView(generics.RetrieveUpdateAPIView):
    queryset = File.objects.all()

    def get_serializer_class(self, *args, **kwargs):
        if self.request.method == "GET":
            return ReadSerializer
        elif self.request.method in ["PUT", "PATCH"]:
            return UpdateSerializer
        else:
            return ReadSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH"]:
            return [IsResourceOwner()]
        else:
            return [CanViewFile()]

    @file_detail_view_schema(method="PUT")
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(updated_at=timezone.now())

        return Response(ReadSerializer(instance).data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


class FileListView(CreateListModelMixin, generics.ListCreateAPIView):
    pagination_class = MaiplPagination
    filterset_class = FileFilter

    sort_map = {
        "path": "path",
        "tag": "tag",
    }

    default_sort_field = "path"

    def perform_create(self, serializer):
        data = UploadValidationHandler(self.request)
        data.validate()
        try:
            serializer.save()
        except django.db.IntegrityError:
            raise ConflictError(
                detail={
                    "code": "duplicate_file",
                    "message": "A file with this path already exists",
                    "path": serializer.validated_data.get('path'),
                    "type": "file_conflict"
                }
            )

    def get_queryset(self):
        shared = self.request.query_params.get("shared", "all")
        user_id = self.request.user.id
        if shared == "true":
            return File.objects.filter(shared_to=user_id).order_by("pk")
        elif shared == "false":
            return File.objects.filter(user_id=user_id).order_by("pk")
        elif shared == "all":
            return File.objects.filter(
                Q(user_id=user_id) | Q(shared_to=user_id)
            ).order_by("pk").distinct()

    def get_serializer_class(self, *args, **kwargs):
        if self.request.method == "GET":
            return ReadSerializer
        elif self.request.method == "PUT":
            return UpdateSerializer
        elif self.request.method == "POST":
            return CreateSerializer

    def delete(self, request, *args, **kwargs):
        # ?ids=… must be specified
        value = request.query_params.get("ids")
        if not value:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # all ids must be integers
        try:
            ids = [int(s) for s in value.split(",")]
        except ValueError:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # at least one id must be specified
        if not ids:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # only delete files owned by the user
        files = File.objects.filter(user_id=request.user.id, id__in=ids)
        for file in files:
            file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SetFilesSharedView(APIView):

    @set_file_shared_view_schema(method="post")
    def post(self, request, format=None):
        serializer = FileChangeSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        for item in serializer.validated_data:
            file_id = item["file"]
            changes = item["changes"]

            file = File.objects.filter(id=file_id).first()
            if not file:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST,
                    data={"error": f"File {file_id} does not exist"},
                )

            try:
                file.share_file(request.user, changes)
            except ValidationError as e:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST, data={"error": str(e)}
                )

        return Response(status=status.HTTP_200_OK, data={"message": "Files shared"})


class FileFolderView(APIView):
    """
    View for listing folder contents (subfolders and files) for a given path prefix.
    Returns paginated files and a list of direct subfolders.
    """
    pagination_class = MaiplPagination

    def get_queryset(self):
        """Get base queryset filtered by user permissions and maipl_folder."""
        shared = self.request.query_params.get("shared", "all")
        user_id = self.request.user.id
        maipl_folder = self.request.query_params.get("maipl_folder")
        
        queryset = File.objects.all()
        
        # Filter by maipl_folder if provided
        if maipl_folder:
            queryset = queryset.filter(maipl_folder=maipl_folder)
        
        # Filter by shared status
        if shared == "true":
            queryset = queryset.filter(shared_to=user_id)
        elif shared == "false":
            queryset = queryset.filter(user_id=user_id)
        elif shared == "all":
            queryset = queryset.filter(
                Q(user_id=user_id) | Q(shared_to=user_id)
            ).distinct()
        
        return queryset.order_by("path")

    def get(self, request, *args, **kwargs):
        """Return folders and paginated files for the given path_prefix."""
        path_prefix = request.query_params.get("path_prefix", "")
        tag = request.query_params.get("tag", "")
        
        # Get base queryset
        queryset = self.get_queryset()
        
        # Filter by tag if provided
        if tag:
            queryset = queryset.filter(tag__icontains=tag)
        
        # Get direct subfolders
        folders = get_direct_subfolders(queryset, path_prefix)
        
        # Get files directly in this folder (not in subfolders)
        files_queryset = get_files_in_folder(queryset, path_prefix)
        
        # Paginate files
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(files_queryset, request)
        
        if page is not None:
            serializer = ReadSerializer(page, many=True)
            paginated_response = paginator.get_paginated_response(serializer.data)
            
            # Structure response with folders and files separately
            response_data = paginated_response.data
            return Response({
                "folders": folders,
                "files": {
                    "data": response_data["data"],
                    "page": response_data["page"],
                    "size": response_data["size"],
                    "count": response_data["count"],
                    "prev": response_data["prev"],
                    "next": response_data["next"],
                }
            })
        
        # If no pagination, return all files (shouldn't happen with MaiplPagination)
        serializer = ReadSerializer(files_queryset, many=True)
        return Response({
            "folders": folders,
            "files": {
                "data": serializer.data,
                "page": 1,
                "size": len(serializer.data),
                "count": len(serializer.data),
                "prev": None,
                "next": None,
            }
        })
