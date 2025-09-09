from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from django.http import HttpResponse

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
            task = TrainingTask.objects.get(id=task_id, user_id=request.user.id)
        except TrainingTask.DoesNotExist:   
            return Response({"error": "Training task not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # get the task, console output, training log JSON, or ketos-train.log
        if request.path.endswith(f"/tasks/{task_id}/"):
            serializer = self.get_serializer(task)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif request.path.endswith(f"/tasks/{task_id}/console/"):
            import os
            from common.file_utils import read_console_output

            if not task.local_path:
                return Response({"error": "Task has no local path set"}, status=status.HTTP_404_NOT_FOUND)

            console_file_path = os.path.join(task.local_path, "console.txt")
            if not os.path.exists(console_file_path):
                return Response({"error": "Console output not found"}, status=status.HTTP_404_NOT_FOUND)

            content = read_console_output(console_file_path)
            if content is None:
                return Response({"error": "Failed to read console output"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Return plain readable text
            return HttpResponse(content, content_type='text/plain')
        elif request.path.endswith(f"/tasks/{task_id}/log/"):
            import os
            from common.file_utils import read_console_output

            if not task.local_path:
                return Response({"error": "Task has no local path set"}, status=status.HTTP_404_NOT_FOUND)

            output_dir = os.path.join(task.local_path, "output")
            log_file_path = os.path.join(output_dir, "ketos-train.log")

            if not os.path.exists(log_file_path):
                return Response({"error": "ketos-train.log not found"}, status=status.HTTP_404_NOT_FOUND)

            log_content = read_console_output(log_file_path)
            if log_content is None:
                return Response({"error": "Failed to read ketos-train.log"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Try to attach CSV content
            csv_file_path = os.path.join(output_dir, "log_dty_model.csv")
            csv_content = None

            if not os.path.exists(csv_file_path):
                try:
                    # Fallback: find any log_*.csv in output directory
                    if os.path.exists(output_dir):
                        for name in os.listdir(output_dir):
                            if name.startswith("log_") and name.endswith(".csv"):
                                csv_file_path = os.path.join(output_dir, name)
                                break
                    # Final fallback: legacy copy at task root
                    if not os.path.exists(csv_file_path):
                        candidate = os.path.join(task.local_path, "training_log.csv")
                        if os.path.exists(candidate):
                            csv_file_path = candidate
                except Exception:
                    pass

            if os.path.exists(csv_file_path):
                csv_content = read_console_output(csv_file_path)
            # Merge into plain readable text, appending CSV if present
            merged = log_content if isinstance(log_content, str) else ""
            if csv_content:
                merged += "\n\n=== Training CSV ===\n" + csv_content
            return HttpResponse(merged, content_type='text/plain')
        else:
            return Response("Invalid path.", status=status.HTTP_400_BAD_REQUEST)


## Removed separate APIView classes; functionality is handled in TrainingTaskDetailView
