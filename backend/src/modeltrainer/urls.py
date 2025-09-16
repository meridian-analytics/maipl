from django.urls import path

from .views import TrainingTaskListView, TrainingTaskDetailView

app_name = 'trainer'

urlpatterns = [
    path('tasks/', TrainingTaskListView.as_view(), name='trainingtask-list'),
    path('tasks/<int:pk>/', TrainingTaskDetailView.as_view(), name='trainingtask-detail'),
    path('tasks/<int:pk>/console/', TrainingTaskDetailView.as_view(), name='trainingtask-console'),
    path('tasks/<int:pk>/log/', TrainingTaskDetailView.as_view(), name='trainingtask-log'),
]
