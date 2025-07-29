from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import MaiplPagination
from common.shared_mixins import CreateListModelMixin, DeleteByIdsMixin
from common.sorting import SortableMixin

from .models import DatabaseTask, DatabaseGroup
from .serializers import (
    DatabaseTaskSerializer,
    DatabaseTaskReadSerializer,
    DatabaseTaskCreateSerializer,
    DatabaseTaskStatusUpdateSerializer,
    DatabaseTaskSummarySerializer,
    DatabaseGroupSerializer,
    DatabaseGroupReadSerializer,
    DatabaseGroupStatusUpdateSerializer,
    DatabaseGroupSummarySerializer,
)


class DatabaseTaskListView(CreateListModelMixin, SortableMixin, DeleteByIdsMixin, generics.ListCreateAPIView):
    """List and create database tasks."""
    
    pagination_class = MaiplPagination
    filterset_fields = {
        'status': ['exact', 'in'],
        'created_at': ['gte', 'lte'],
        'updated_at': ['gte', 'lte'],
    }
    sort_map = {
        'id': 'id',
        'task_name': 'task_name',
        'status': 'status',
        'created_at': 'created_at',
        'updated_at': 'updated_at',
    }
    default_sort_field = 'created_at'
    
    def get_queryset(self):
        """Filter tasks by current user."""
        user_id = self.request.user.id
        return DatabaseTask.objects.filter(user=user_id)
    
    def get_serializer_class(self):
        """Use different serializers for different operations."""
        if self.request.method == 'GET':
            return DatabaseTaskSummarySerializer
        elif self.request.method == 'POST':
            return DatabaseTaskCreateSerializer
        return DatabaseTaskSerializer


class DatabaseTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete a specific database task."""
    
    def get_queryset(self):
        """Filter tasks by current user."""
        user_id = self.request.user.id
        return DatabaseTask.objects.filter(user=user_id)
    
    def get_serializer_class(self):
        """Use different serializers for different operations."""
        if self.request.method == 'GET':
            return DatabaseTaskReadSerializer
        elif self.request.method == 'PUT' or self.request.method == 'PATCH':
            return DatabaseTaskSerializer
        return DatabaseTaskSerializer


class DatabaseTaskStatusView(generics.UpdateAPIView):
    """Update only the status and celery_task_id of a database task."""
    
    serializer_class = DatabaseTaskStatusUpdateSerializer
    
    def get_queryset(self):
        """Filter tasks by current user."""
        user_id = self.request.user.id
        return DatabaseTask.objects.filter(user=user_id)


class DatabaseGroupListView(CreateListModelMixin, SortableMixin, DeleteByIdsMixin, generics.ListCreateAPIView):
    """List and create database groups."""
    
    pagination_class = MaiplPagination
    filterset_fields = {
        'status': ['exact', 'in'],
        'source': ['exact', 'in'],
        'task': ['exact'],
        'created_at': ['gte', 'lte'],
    }
    sort_map = {
        'id': 'id',
        'name': 'name',
        'status': 'status',
        'source': 'source',
        'created_at': 'created_at',
    }
    default_sort_field = 'created_at'
    
    def get_queryset(self):
        """Filter groups by current user's tasks."""
        user_id = self.request.user.id
        return DatabaseGroup.objects.filter(task__user=user_id)
    
    def get_serializer_class(self):
        """Use different serializers for different operations."""
        if self.request.method == 'GET':
            return DatabaseGroupSummarySerializer
        elif self.request.method == 'POST':
            return DatabaseGroupSerializer
        return DatabaseGroupSerializer


class DatabaseGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete a specific database group."""
    
    def get_queryset(self):
        """Filter groups by current user's tasks."""
        user_id = self.request.user.id
        return DatabaseGroup.objects.filter(task__user=user_id)
    
    def get_serializer_class(self):
        """Use different serializers for different operations."""
        if self.request.method == 'GET':
            return DatabaseGroupReadSerializer
        elif self.request.method == 'PUT' or self.request.method == 'PATCH':
            return DatabaseGroupSerializer
        return DatabaseGroupSerializer


class DatabaseGroupStatusView(generics.UpdateAPIView):
    """Update only the status, celery_task_id, and statistics of a database group."""
    
    serializer_class = DatabaseGroupStatusUpdateSerializer
    
    def get_queryset(self):
        """Filter groups by current user's tasks."""
        user_id = self.request.user.id
        return DatabaseGroup.objects.filter(task__user=user_id)


class DatabaseTaskGroupsView(generics.ListCreateAPIView):
    """List and create groups for a specific database task."""
    
    pagination_class = MaiplPagination
    filterset_fields = {
        'status': ['exact', 'in'],
        'source': ['exact', 'in'],
        'created_at': ['gte', 'lte'],
    }
    
    def get_queryset(self):
        """Filter groups by the specific task and current user."""
        task_id = self.kwargs.get('task_id')
        user_id = self.request.user.id
        return DatabaseGroup.objects.filter(
            task_id=task_id,
            task__user=user_id
        )
    
    def get_serializer_class(self):
        """Use different serializers for different operations."""
        if self.request.method == 'GET':
            return DatabaseGroupSummarySerializer
        elif self.request.method == 'POST':
            return DatabaseGroupSerializer
        return DatabaseGroupSerializer
    
    def perform_create(self, serializer):
        """Set the task for the group being created."""
        task_id = self.kwargs.get('task_id')
        task = DatabaseTask.objects.get(id=task_id, user=self.request.user.id)
        serializer.save(task=task)


class DatabaseTaskGroupsDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete a specific group within a task."""
    
    def get_queryset(self):
        """Filter groups by the specific task and current user."""
        task_id = self.kwargs.get('task_id')
        user_id = self.request.user.id
        return DatabaseGroup.objects.filter(
            task_id=task_id,
            task__user=user_id
        )
    
    def get_serializer_class(self):
        """Use different serializers for different operations."""
        if self.request.method == 'GET':
            return DatabaseGroupReadSerializer
        elif self.request.method == 'PUT' or self.request.method == 'PATCH':
            return DatabaseGroupSerializer
        return DatabaseGroupSerializer


class DatabaseTaskGroupsStatusView(generics.UpdateAPIView):
    """Update status and statistics of a specific group within a task."""
    
    serializer_class = DatabaseGroupStatusUpdateSerializer
    
    def get_queryset(self):
        """Filter groups by the specific task and current user."""
        task_id = self.kwargs.get('task_id')
        user_id = self.request.user.id
        return DatabaseGroup.objects.filter(
            task_id=task_id,
            task__user=user_id
        )


class DatabaseTaskStatisticsView(APIView):
    """Get statistics for a specific database task."""
    
    def get(self, request, task_id):
        """Return task statistics including group counts and sample totals."""
        try:
            task = DatabaseTask.objects.get(id=task_id, user=request.user.id)
        except DatabaseTask.DoesNotExist:
            return Response(
                {"error": "Database task not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        statistics = {
            'task_id': task.id,
            'task_name': task.task_name,
            'status': task.status,
            'groups_count': task.groups_count,
            'total_samples': task.total_samples,
            'groups': []
        }
        
        # Add statistics for each group
        for group in task.groups.all():
            group_stats = {
                'id': group.id,
                'name': group.name,
                'status': group.status,
                'source': group.source,
                'file_count': group.file_count,
                'label_count': group.label_count,
                'total_samples': group.total_samples,
            }
            statistics['groups'].append(group_stats)
        
        return Response(statistics, status=status.HTTP_200_OK)
