import os
import subprocess
import shutil

from django.db import models

from common.file_utils import FileUtils
from common.logger import metrics_logger

# Create your models here.
from file.models import File
from user.models import User

from .tasks import metrics_eval_background, metrics_eval


class MetricsTaskService:
    def __init__(self):
        self.file_utils = FileUtils()
        self.logger = metrics_logger

    def start(self, task):
        self.logger.info(f"Starting metrics task {task.id}")
        task.status = "STARTED"
        task.save()
        if task.parameters["add_ref"]:
            self.logger.info(f"Offloading task {task.id} to background worker")
            metrics_eval_background.delay(task.id)
        else:
            metrics_eval.delay(task.id)

class MetricsTask(models.Model):

    TASK_STATUS = [
        ("CREATED", "Created"),
        ("STARTED", "Started"),
        ("RUNNING", "Running"),
        ("FAILURE", "Failure"),
        ("SUCCESS", "Success"),
    ]

    class Meta:
        ordering = ["id"]

    description = models.CharField(
        max_length=255,
        null=True,
        default=None,
        blank=True,
        help_text="Description of the metrics task",
    )
    folder = models.CharField(max_length=128)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="metrics_tasks",
        help_text="User who created the metrics task",
    )
    eval_file = models.ForeignKey(
        File,
        on_delete=models.CASCADE,
        related_name="eval_file_metrics_tasks",
        help_text="Evaluation file",
    )
    ref_file = models.ForeignKey(
        File,
        on_delete=models.CASCADE,
        related_name="ref_file_metrics_tasks",
        help_text="Reference file",
    )
    parameters = models.JSONField(
        default=dict,
        help_text="Parameters for the metrics task including type, thresholds, time units, and background settings",
    )
    bg_audio_list = models.ManyToManyField(
        File,
        related_name="audio_list_metrics_tasks", 
        help_text="List of audio files",
    )
    output_files = models.ManyToManyField(
        File,
        related_name="output_files_metrics_tasks",
        help_text="List of output files",
    )
    status = models.CharField(
        max_length=10,
        choices=TASK_STATUS,
        default="CREATED",
        help_text="Status of the metrics task",
    )
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Date and time when the metrics task was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True, help_text="Date and time when the metrics task was last updated"
    )

    def __str__(self):
        # return a string representation of a metrics task
        return f"{self.id} - {self.description} - {self.created_at}"

    def start(self):
        MetricsTaskService().start(self)
