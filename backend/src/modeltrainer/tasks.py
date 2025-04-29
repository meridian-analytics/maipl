import os

from celery import shared_task
from django.conf import settings
from common.logger import modeltrainer_logger
from common.file_utils import FileUtils

from .models import TrainingTask

from constance import config
from .mock_services import mock_train_model

TASK_LOCAL_STORAGE = settings.TASKS_LOCAL_STORAGE
FILE_CACHE_DIR = settings.FILE_CACHE_DIR
USE_MOCK_TRAINING = config.USE_MOCK_TRAINING

@shared_task(bind=True, name='train_model')
def train_model(self, task_id):
    task = TrainingTask.objects.get(id=task_id)
    task.status = 'STARTED'
    task.save()
    modeltrainer_logger.info(f"Task: {task} started")
    
    file_utils = FileUtils()
    task_context = {
        "task": task,
        "local_path": file_utils.create_local_path(task, "train"),
        "console_output_file": file_utils.create_console_output_file(task),
        "dataset_file": "",
        "recipe_file": "",
    }
    download_training_files(task_context, file_utils)
    run_training(task_context)

def download_training_files(task_context, file_utils):
    task = task_context["task"]
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]

    dataset_cache_path = file_utils.download_file(task.dataset_file_id)
    recipe_cache_path = file_utils.download_file(task.recipe_file_id)

    #create symlinks to the cache path
    os.symlink(dataset_cache_path, os.path.join(local_path, "dataset.h5"))
    os.symlink(recipe_cache_path, os.path.join(local_path, "recipe.json"))

    task_context["dataset_file"] = os.path.join(local_path, "dataset.h5")
    task_context["recipe_file"] = os.path.join(local_path, "recipe.json")
    
    modeltrainer_logger.info(f"Dataset file: {task_context['dataset_file']}")
    modeltrainer_logger.info(f"Recipe file: {task_context['recipe_file']}")

    #write the dataset and recipe file paths to the console output file
    file_utils.write_to_console(console_output_file, [
        f"Dataset file: {task_context['dataset_file']}",
        f"Recipe file: {task_context['recipe_file']}",
        "Files downloaded"
    ])
    
    #write the content of the recipt file to the console output file
    with open(recipe_cache_path) as f:
        file_utils.write_to_console(console_output_file, [
            f"Recipe file content: {f.read()}"
        ])

def run_training(task_context):
    task = task_context["task"]
    if USE_MOCK_TRAINING:
        task.status = 'RUNNING'
        task.save()
        model_file_path = mock_train_model(task_context)
    else:
        real_training(task_context)

def real_training(task_context):
    pass
