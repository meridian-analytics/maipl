from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response

from common.shared_mixins import CreateListModelMixin
from common.pagination import MaiplPagination

from .models import TrainingTask
from .serializers import TrainingTaskSerializer
from .tasks import train_model



# Create your views here.

class TrainingTaskListView(CreateListModelMixin, generics.ListCreateAPIView):
    serializer_class = TrainingTaskSerializer
    pagination_class = MaiplPagination

    def get_queryset(self):
        user_id = self.request.user.id
        return TrainingTask.objects.filter(user_id=user_id)

class TrainingTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TrainingTaskSerializer

    def get_queryset(self):
        user_id = self.request.user.id
        return TrainingTask.objects.filter(user_id=user_id)

    # override the post method to start the training task
    def post(self, request, *args, **kwargs):
        task_id = kwargs.get('pk')
        if task_id is None:
            return Response("No task_id provided.", status=status.HTTP_400_BAD_REQUEST)
        
        try:
            task = TrainingTask.objects.get(id=task_id)
        except TrainingTask.DoesNotExist:   
            return Response("No task found with the given task_id.", status=status.HTTP_404_NOT_FOUND)
        
        # check if the task is already started, successful or failed    
        if task.status == 'STARTED' or task.status == 'SUCCESS' or task.status == 'FAILURE':
            return Response("The task is already started, successful or failed.", status=status.HTTP_400_BAD_REQUEST)
        
        # start the training task
        celery_task = train_model.delay(task.id)
        task.celery_task_id = celery_task.id
        task.status = 'PENDING'
        task.save()

        return Response(f"The task {task_id} is started.", status=status.HTTP_200_OK)
        
    # override the get method to get the console output or the log file
    # /tasks/<task_id>/  -> return the task 
    # /tasks/<task_id>/console_output -> return the console output
    # /tasks/<task_id>/log_file -> return the log file

    def get(self, request, *args, **kwargs):
        task_id = kwargs.get('pk')
        if task_id is None:
            return Response("No task_id provided.", status=status.HTTP_400_BAD_REQUEST)
        
        try:
            task = TrainingTask.objects.get(id=task_id)
        except TrainingTask.DoesNotExist:   
            return Response("No task found with the given task_id.", status=status.HTTP_404_NOT_FOUND)
        
        # get the task or console output or the log 
        if request.path.endswith(f"/tasks/{task_id}/"):
            serializer = self.get_serializer(task)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif request.path.endswith(f"/tasks/{task_id}/console/"):
            return Response(task.get_console_output(), status=status.HTTP_200_OK)
        elif request.path.endswith(f"/tasks/{task_id}/log/"):
            return Response(task.get_log(), status=status.HTTP_200_OK)
        else:
            return Response("Invalid path.", status=status.HTTP_400_BAD_REQUEST)
