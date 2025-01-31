import os
import subprocess

from django.db import models

from common.file import FileUtils

# Create your models here.
from file.models import File
from user.models import User

from .tasks import metrics_eval_background


class MetricsTaskService:
    @staticmethod
    def start(task):
        task.status = "STARTED"
        task.save()
        if task.add_bg_ref:
            # offload to celery workers
            metrics_eval_background.delay(task)
        else:
            MetricsTaskService.evaluate(task)

    @staticmethod
    def evaluate(task):
        command = MetricsTaskService.construct_command(task)
        result = subprocess.run(command)
        if result.returncode != 0:
            task.status = "FAILURE"
            task.save()
            raise Exception(
                f"Metrics task {task.id} failed with return code {result.returncode}. Error: {result.stderr}"
            )

        # upload the output files
        output_folder = f"/temp/metrics/{task.user.id}/{task.id}"
        metric_file_path = f"{output_folder}/metrics.csv"
        result_file_path = f"{output_folder}/results.csv"
        metric_file = FileUtils.upload_file(
            metric_file_path,
            task.user,
            "metrics",
            f"/{task.folder}/metrics.csv",
            task.folder
        )
        result_file = FileUtils.upload_file(
            result_file_path,
            task.user,
            "metrics",
            f"/{task.folder}/results.csv"
        )
        # generate a json file with metadata
        date_time = task.created_at.strftime("%Y-%m-%d %H:%M:%S")
        meta_data = MetricsTaskService.meta_data(task, date_time)
        meta_file_path = f"{output_folder}/metadata.json"
        with open(meta_file_path, "w", encoding="utf-8") as f:
            f.write(str(meta_data))
        meta_file = FileUtils.upload_file(
            meta_file_path,
            task.user,
            "metrics",
            f"/{task.folder}/metadata.json"
        )

        task.output_files.add(metric_file)
        task.output_files.add(result_file)
        task.output_files.add(meta_file)
        task.status = "SUCCESS"
        task.save()

        # delete the output folder
        os.rmdir(output_folder)

    @staticmethod
    def construct_command(task):

        ref_file_path = FileUtils.download_file(task.ref_file.id)
        eval_file_path = FileUtils.download_file(task.eval_file.id)

        return [
            "ketos-metrics",
            f"{eval_file_path}",
            f"{ref_file_path}",
            "--type",
            f"{task.type}",
            "--threshold_min",
            f"{task.threshold_min}",
            "--threshold_max",
            f"{task.threshold_max}",
            "--threshold_inc",
            f"{task.threshold_increment}",
            "--total_time_units",
            f"{task.total_time_units}",
            "--output_folder",
            f"/temp/metrics/{task.user.id}/{task.id}",
        ]

    @staticmethod
    def meta_data(task, date_time):
        return {
            "id": task.id,
            "description": task.description,
            "user": task.user.email,
            "eval_file": task.eval_file.basename,
            "ref_file": task.ref_file.basename,
            "type": task.type,
            "threshold_min": task.threshold_min,
            "threshold_max": task.threshold_max,
            "threshold_increment": task.threshold_increment,
            "total_time_units": task.total_time_units,
            "bg_audio_list": [audio.basename for audio in task.bg_audio_list.all()],
            "bg_label": task.bg_label,
            "created": date_time,
        }


class MetricsTask(models.Model):

    TASK_STATUS = [
        ("CREATED", "Created"),
        ("STARTED", "Started"),
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
    type = models.CharField(
        max_length=64,
        default="continuous",
        help_text="Type of the metrics task",
    )
    threshold_min = models.FloatField(
        null=True, default=0, help_text="Minimum threshold value"
    )
    threshold_max = models.FloatField(
        null=True, default=1, help_text="Maximum threshold value"
    )
    threshold_increment = models.FloatField(
        null=True, default=0.05, help_text="Threshold increment value"
    )
    total_time_units = models.FloatField(
        null=True,
        default=1,
        help_text="The total duration in arbitrary time units over which the detections were made (e.g., hours, minutes).",
    )
    add_bg_ref = models.BooleanField(
        null=True,
        default=False,
        help_text="Create background reference for audio files given a set of existing annotations. The 'reference' annotations will be updated to include the new annotations. Pass two parameters: [path_to_audio_folder, label].",
    )
    bg_audio_list = models.ManyToManyField(
        File,
        related_name="audio_list_metrics_tasks",
        help_text="List of audio files",
    )
    bg_label = models.CharField(
        max_length=64,
        null=True,
        default=None,
        blank=True,
        help_text="The second parameter that is the label assigned to the background noise. ",
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
        MetricsTaskService.start(self)
