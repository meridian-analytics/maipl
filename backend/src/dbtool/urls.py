from django.urls import path

from .views import (
    DatabaseTaskListView,
    DatabaseTaskDetailView,
    DatabaseTaskStatusView,
    DatabaseTaskStatisticsView,
    DatabaseGroupListView,
    DatabaseGroupDetailView,
    DatabaseGroupStatusView,
    DatabaseTaskGroupsView,
    DatabaseTaskGroupsDetailView,
    DatabaseTaskGroupsStatusView,
    DatabaseGroupProcessingView,
)

app_name = 'dbtool'

urlpatterns = [
    # Database Task endpoints
    path('tasks/', DatabaseTaskListView.as_view(), name='task-list'),
    path('tasks/<int:pk>/', DatabaseTaskDetailView.as_view(), name='task-detail'),
    path('tasks/<int:pk>/status/', DatabaseTaskStatusView.as_view(), name='task-status'),
    path('tasks/<int:pk>/statistics/', DatabaseTaskStatisticsView.as_view(), name='task-statistics'),

    
    # Database Group endpoints (global)
    path('groups/', DatabaseGroupListView.as_view(), name='group-list'),
    path('groups/<int:pk>/', DatabaseGroupDetailView.as_view(), name='group-detail'),
    path('groups/<int:pk>/status/', DatabaseGroupStatusView.as_view(), name='group-status'),
    
    # Database Group endpoints (within a task)
    path('tasks/<int:task_id>/groups/', DatabaseTaskGroupsView.as_view(), name='task-groups'),
    path('tasks/<int:task_id>/groups/<int:pk>/', DatabaseTaskGroupsDetailView.as_view(), name='task-group-detail'),
    path('tasks/<int:task_id>/groups/<int:pk>/status/', DatabaseTaskGroupsStatusView.as_view(), name='task-group-status'),
    path('tasks/<int:task_id>/groups/<int:group_id>/processing/', DatabaseGroupProcessingView.as_view(), name='task-group-processing'),
] 