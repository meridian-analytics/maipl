from celery.result import AsyncResult
from rest_framework import generics, status
from rest_framework.response import Response

from common.pagination import MaiplPagination
from common.shared_mixins import CreateListModelMixin


from .models import Detection, ModelRunnerTask
from .serializers import DetectionSerializer, ModelRunnerTaskSerializer
from .tasks import run_model


class ModelRunnerTaskView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ModelRunnerTaskSerializer
    
    def get_queryset(self):
        user_id = self.request.user.id
        return ModelRunnerTask.objects.filter(user_id=user_id)
    
    # override the get request so the task status is synced with celery task status
    def get(self, request, *args, **kwargs):
        # get the task_id from the request
        task_id = kwargs.get('pk')
        # check if the task_id is valid
        if task_id is None:
            return Response("No task_id provided.", status=status.HTTP_400_BAD_REQUEST)
        # get the ModelRunnerTask instance from the database
        try:
            model_task = ModelRunnerTask.objects.get(id=task_id)
        except ModelRunnerTask.DoesNotExist:
            return Response("No task found with the given task_id.", status=status.HTTP_404_NOT_FOUND)
        
        if request.path.endswith(f"/tasks/{task_id}/"):
            serializer = self.get_serializer(model_task)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif request.path.endswith(f"/tasks/{task_id}/console/"):
            return Response(model_task.get_console_output(), status=status.HTTP_200_OK)
        elif request.path.endswith(f"/tasks/{task_id}/log/"):
            return Response(model_task.get_log(), status=status.HTTP_200_OK)
        else:
            return Response("Invalid path.", status=status.HTTP_400_BAD_REQUEST)

    # override the post request so the task is started, not for creating a new task
    def post(self, request, *args, **kwargs):
        # get the task_id from the request
        task_id = kwargs.get('pk')
        # check if the task_id is valid
        if task_id is None:
            return Response("No task_id provided.", status=status.HTTP_400_BAD_REQUEST)
        # get the ModelRunnerTask instance from the database
        try:
            model_task = ModelRunnerTask.objects.get(id=task_id)
        except ModelRunnerTask.DoesNotExist:
            return Response("No task found with the given task_id.", status=status.HTTP_404_NOT_FOUND)
    
        # check if the task is already started
        if model_task.status == "STARTED":
            return Response("The task is already started.", status=status.HTTP_400_BAD_REQUEST)
        # check if the task is already successful
        if model_task.status == "SUCCESS":
            return Response("The task is already successful.", status=status.HTTP_400_BAD_REQUEST)
        # check if the task is already failed
        if model_task.status == "FAILURE":
            return Response("The task is already failed.", status=status.HTTP_400_BAD_REQUEST)
        # check if the task is already revoked
        if model_task.status == "REVOKED":
            return Response("The task is already revoked.", status=status.HTTP_400_BAD_REQUEST)
        
        # set the status of the task to STARTED
        model_task.status = "STARTED"

        # call the task with the model_task instance
        celery_task = run_model.delay(model_task.id)

        # update the celery_task_id field of the model_task instance
        model_task.celery_task_id = celery_task.id

        model_task.save()

        # return a response indicating the task was successfully started
        return Response(ModelRunnerTaskSerializer(model_task).data, status=status.HTTP_200_OK)

    
# List view for all model runner tasks
class ModelRunnerTaskListView(CreateListModelMixin, generics.ListCreateAPIView):
    serializer_class = ModelRunnerTaskSerializer
    filterset_fields = ['status']

    def get_queryset(self):
        user_id = self.request.user.id
        return ModelRunnerTask.objects.filter(user_id=user_id)


# filter the detection scores

class DetectionListExportView(generics.ListAPIView):
   serializer_class = DetectionSerializer
   queryset = Detection.objects.all()

   filterset_fields = {
         'user_id': ['exact'],
         'label': ['exact'],
         'task': ['exact'],
         'filename': ['exact'],
         'score': ['exact', 'gte', 'lte', 'gt', 'lt'],
   }

class DetectionListView(DetectionListExportView):
    pagination_class = MaiplPagination


class DetectionDetailView(generics.RetrieveAPIView):
    serializer_class = DetectionSerializer
    queryset = Detection.objects.all()

