import os

from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from file.models import File
from user.models import User



class ModelRunnerTask(models.Model):
    #
    # ModelRunnerTask model
    # This model is used to store information about a model runner task.
    # It is used to track the status of a model runner task and to store
    # the results of a model runner task.
    #
    TASK_STATUS = [
        ('CREATED', 'Created'), # task created but not yet queued
        ('PENDING', 'Pending'),
        ('STARTED', 'Started'),
        ('FAILURE', 'Failure'),
        ('RETRY', 'Retry'),
        ('REVOKED', 'Revoked'),
        ('SUCCESS', 'Success'),
    ]
    class Meta:
        ordering = ['id']

    description = models.CharField(max_length=255, null=True, default=None, blank=True, help_text='Description of the model runner task')
    celery_task_id = models.CharField(max_length=255, unique=True, null=True, default=None, blank=True, help_text='Celery task id')
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name='model_tasks', help_text='User who created the model runner task')
    filelist = models.ManyToManyField(File, related_name='filelist_tasks', help_text='List of files to process')
    model_file = models.ForeignKey(File, null=True, blank=True, default=None, on_delete=models.SET_NULL, related_name='model_file_tasks', help_text='Model file to use for processing')
    detections = models.ForeignKey(File, null=True, blank=True, default=None, on_delete=models.SET_NULL, related_name='detections_tasks', help_text='Detections file')
    parameters = models.JSONField(default=dict, help_text='Model parameters including threshold, step_size, batch_size, merge_detections, overwrite, and buffer')
    status = models.CharField(max_length=10, choices=TASK_STATUS, default='CREATED', help_text='Status of the model runner task')
    created_at = models.DateTimeField(auto_now_add=True, help_text='Date and time when the model runner task was created')
    updated_at = models.DateTimeField(auto_now=True, help_text='Date and time when the model runner task was last updated')

    def __str__(self):
        # return a string representation of a model runner task
        return f'{self.id} - {self.created_at}'

    def get_console_output(self):
        # return the console output of the model runner task
        console_output_file_path = os.path.join("/tasks", "runner", str(self.id), "console.txt")
        try:
            if os.path.exists(console_output_file_path):
                return open(console_output_file_path, "r").read()
        except:
            pass
        return ""
    
    def get_log(self):
        # return the log of the model runner task
        log_file_path = os.path.join("/tasks", "runner", str(self.id), "detections", "ketos-run.log")
        try:
            if os.path.exists(log_file_path):
                return open(log_file_path, "r").read()
        except:
            pass
        return ""
    
    @property
    def title(self):
        # return a title for the model runner task
        return f'{self.id} - {self.created_at}'

@receiver(pre_delete, sender=ModelRunnerTask)
def delete_task_files(sender, instance, **kwargs):
    # delete the task directory
    import shutil
    task_path = os.path.join("/tasks", "runner", str(instance.id))
    shutil.rmtree(task_path, ignore_errors=True)



class Detection(models.Model):
    #
    # Detection model
    # This model is used to store information about a detection.
    # It is used to store the results of a model runner task.
    #
    filename = models.CharField(max_length=255, help_text='Filename')
    start = models.FloatField(help_text='Start')
    end = models.FloatField(help_text='End')
    score = models.FloatField(help_text='score')
    label = models.CharField(max_length=255, help_text='Label')
    task = models.ForeignKey(ModelRunnerTask, on_delete=models.CASCADE, related_name='task_detections', help_text='Model runner task')
    created_at = models.DateTimeField(auto_now_add=True, help_text='Date and time when the detection was created')
    updated_at = models.DateTimeField(auto_now=True, help_text='Date and time when the detection was last updated')
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_detections', help_text='User who created the detection')

    def __str__(self):
        # return a string representation of a detection
        return f'{self.id} - {self.created_at}'
    
    # @property
    # def filename(self):
    #     # return the filename of the file associated with the detection
    #     # Note: file field was removed, so we return the filename field directly
    #     return self.filename
