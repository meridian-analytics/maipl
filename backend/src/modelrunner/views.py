import csv
import os
import tempfile
from celery.result import AsyncResult
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import MaiplPagination
from common.shared_mixins import CreateListModelMixin
from common.file_utils import FileUtils

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


class DetectionListExportToFileView(APIView):
    """
    Export filtered detections to CSV and upload to file module.
    
    Query parameters:
    - task (required): Task ID to filter detections
    - label (optional): Filter by label
    - score__gte (optional): Minimum score
    - score__lte (optional): Maximum score
    - score__gt (optional): Score greater than
    - score__lt (optional): Score less than
    - user_id (optional): Filter by user ID
    - filename (optional): Filter by filename
    
    Returns the uploaded File instance.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.file_utils = FileUtils()
    
    def get(self, request):
        # Get required task_id parameter
        task_id = request.query_params.get('task')
        if not task_id:
            return Response(
                {"error": "task parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            task_id = int(task_id)
        except ValueError:
            return Response(
                {"error": "task must be a valid integer"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify task exists and belongs to user
        try:
            task = ModelRunnerTask.objects.get(id=task_id, user_id=request.user.id)
        except ModelRunnerTask.DoesNotExist:
            return Response(
                {"error": "Task not found or access denied"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Build queryset with same filtering as DetectionListExportView
        queryset = Detection.objects.filter(task=task_id, user_id=request.user.id)
        
        # Apply filters
        label = request.query_params.get('label')
        if label:
            queryset = queryset.filter(label=label)
        
        score_gte = request.query_params.get('score__gte')
        if score_gte:
            try:
                queryset = queryset.filter(score__gte=float(score_gte))
            except ValueError:
                return Response(
                    {"error": "score__gte must be a valid number"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        score_lte = request.query_params.get('score__lte')
        if score_lte:
            try:
                queryset = queryset.filter(score__lte=float(score_lte))
            except ValueError:
                return Response(
                    {"error": "score__lte must be a valid number"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        score_gt = request.query_params.get('score__gt')
        if score_gt:
            try:
                queryset = queryset.filter(score__gt=float(score_gt))
            except ValueError:
                return Response(
                    {"error": "score__gt must be a valid number"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        score_lt = request.query_params.get('score__lt')
        if score_lt:
            try:
                queryset = queryset.filter(score__lt=float(score_lt))
            except ValueError:
                return Response(
                    {"error": "score__lt must be a valid number"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        filename_filter = request.query_params.get('filename')
        if filename_filter:
            queryset = queryset.filter(filename=filename_filter)
        
        # Get detections
        detections = queryset.order_by('filename', 'start')
        
        # Generate filename with readable format: detections_task{id}_label{label}_score{min}-{max}.csv
        # Only include parts that are actually filtered (omit unspecified filters)
        filename_parts = [f"detections_task{task_id}"]
        
        # Add label if specified
        if label:
            # Clean up label (remove problematic characters)
            clean_label = str(label).replace('/', '_').replace('\\', '_').replace(' ', '_')
            filename_parts.append(f"label{clean_label}")
        
        # Determine score range if any score filters are specified
        score_min = None
        score_max = None
        
        if score_gte:
            score_min = float(score_gte)
        elif score_gt:
            score_min = float(score_gt)
        
        if score_lte:
            score_max = float(score_lte)
        elif score_lt:
            score_max = float(score_lt)
        
        # Add score range if specified (replace dots with underscores for filename safety)
        if score_min is not None and score_max is not None:
            score_str = f"score{score_min:.3f}-{score_max:.3f}".replace('.', '_')
            filename_parts.append(score_str)
        elif score_min is not None:
            score_str = f"score{score_min:.3f}+".replace('.', '_')
            filename_parts.append(score_str)
        elif score_max is not None:
            score_str = f"score-{score_max:.3f}".replace('.', '_')
            filename_parts.append(score_str)
        
        csv_filename = "_".join(filename_parts) + ".csv"
        
        # Create temporary CSV file
        temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', newline='')
        temp_filepath = temp_file.name
        
        try:
            writer = csv.writer(temp_file)
            # Write header
            writer.writerow(['filename', 'start', 'end', 'label', 'score'])
            
            # Write detection rows
            for detection in detections:
                writer.writerow([
                    detection.filename,
                    detection.start,
                    detection.end,
                    detection.label,
                    detection.score
                ])
            
            temp_file.close()
            
            # Convert TokenUser to User instance (required for File model)
            User = get_user_model()
            user_instance = User.objects.get(id=request.user.id)
            
            # Check if file with same path already exists and delete it (overwrite behavior)
            from file.models import File
            try:
                existing_file = File.objects.get(user_id=user_instance.id, path=csv_filename)
                existing_file.delete(force=True)  # Force delete to bypass in_use check
            except File.DoesNotExist:
                pass  # File doesn't exist, which is fine
            except Exception as e:
                # Log but continue - we'll try to create the file anyway
                pass
            
            # Upload to file module
            file_instance = self.file_utils.upload_file(
                local_file_path=temp_filepath,
                maipl_folder='annotations',
                path=csv_filename,
                meta={
                    'task_id': task_id,
                    'label': label,
                    'score_min': score_gte or score_gt,
                    'score_max': score_lte or score_lt,
                    'detection_count': detections.count()
                },
                user=user_instance
            )
            
            if not file_instance:
                return Response(
                    {"error": "Failed to upload file"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Return file instance data
            return Response({
                'id': file_instance.id,
                'path': file_instance.path,
                'maipl_folder': file_instance.maipl_folder,
                'created_at': file_instance.created_at,
                'meta': file_instance.meta
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to export detections: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            # Clean up temporary file
            if os.path.exists(temp_filepath):
                os.unlink(temp_filepath)

