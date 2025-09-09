import os
import shutil
import subprocess
from typing import Any, Dict, List, Optional

from celery import shared_task, states
from celery.exceptions import Ignore

from django.utils import timezone

from common.logger import modeltrainer_logger
from common.file_utils import FileUtils
from file.models import File

from .models import TrainingTask


def _create_training_workspace(task: TrainingTask, file_utils: FileUtils) -> Dict[str, Any]:
    """
    Create local workspace and console output file for a training task.
    Returns a task_context dict shared across helper functions.
    """
    local_path = file_utils.create_local_path(task, "trainer")
    if not local_path:
        raise Exception("Failed to create local path for training task")

    console_output_file = file_utils.create_console_output_file(task)
    if not console_output_file:
        raise Exception("Failed to create console output file for training task")

    # Pre-create standard subdirectories
    dirs = {
        "dataset_dir": os.path.join(local_path, "dataset"),
        "recipe_dir": os.path.join(local_path, "recipe"),
        "audio_repr_dir": os.path.join(local_path, "audio_repr"),
        "model_dir": os.path.join(local_path, "model"),
        "output_dir": os.path.join(local_path, "output"),
    }
    for d in dirs.values():
        os.makedirs(d, exist_ok=True)

    return {
        "task": task,
        "local_path": local_path,
        "console_output_file": console_output_file,
        **dirs,
    }


def _symlink_downloaded_file(
    downloaded_path: str, target_dir: str, basename: str
) -> str:
    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, basename)
    if os.path.exists(target_path):
        os.remove(target_path)
    os.symlink(downloaded_path, target_path)
    return target_path


def download_dataset_file(task_context: Dict[str, Any], file_utils: FileUtils) -> None:
    task: TrainingTask = task_context["task"]
    console_file = task_context["console_output_file"]
    dataset_dir = task_context["dataset_dir"]

    if not task.dataset_file:
        file_utils.write_to_console(console_file, [
            "ERROR: No dataset file configured for this training task",
            "\n",
        ])
        raise Exception("No dataset file configured")

    try:
        downloaded_path = file_utils.download_file(task.dataset_file.id)
        if not downloaded_path:
            raise Exception(f"Failed to download dataset file {task.dataset_file.id}")

        target_path = _symlink_downloaded_file(downloaded_path, dataset_dir, task.dataset_file.basename)
        file_utils.write_to_console(console_file, [
            "Dataset file downloaded and symlinked:",
            f"  - {os.path.basename(target_path)}",
            "\n",
        ])
        modeltrainer_logger.info(f"Dataset ready at {target_path}")
    except Exception as e:
        modeltrainer_logger.error(f"Error preparing dataset file: {e}")
        raise


def download_recipe_file(task_context: Dict[str, Any], file_utils: FileUtils) -> None:
    task: TrainingTask = task_context["task"]
    console_file = task_context["console_output_file"]
    recipe_dir = task_context["recipe_dir"]

    if not task.recipe_file:
        file_utils.write_to_console(console_file, [
            "ERROR: No recipe file configured for this training task",
            "\n",
        ])
        raise Exception("No recipe file configured")

    try:
        downloaded_path = file_utils.download_file(task.recipe_file.id)
        if not downloaded_path:
            raise Exception(f"Failed to download recipe file {task.recipe_file.id}")

        target_path = _symlink_downloaded_file(downloaded_path, recipe_dir, task.recipe_file.basename)
        file_utils.write_to_console(console_file, [
            "Model recipe downloaded and symlinked:",
            f"  - {os.path.basename(target_path)}",
            "\n",
        ])
        modeltrainer_logger.info(f"Recipe ready at {target_path}")
    except Exception as e:
        modeltrainer_logger.error(f"Error preparing recipe file: {e}")
        raise


def download_audio_representation_file(task_context: Dict[str, Any], file_utils: FileUtils) -> None:
    task: TrainingTask = task_context["task"]
    console_file = task_context["console_output_file"]
    audio_repr_dir = task_context["audio_repr_dir"]

    audio_repr_id = (task.options or {}).get("audio_representation_config_id")
    if not audio_repr_id:
        file_utils.write_to_console(console_file, [
            "ERROR: No audio representation config id provided in options",
            "\n",
        ])
        raise Exception("Missing audio_representation_config_id in options")

    try:
        # Ensure the File exists for clearer logging
        file_instance = File.objects.get(id=audio_repr_id)
        downloaded_path = file_utils.download_file(audio_repr_id)
        if not downloaded_path:
            raise Exception(f"Failed to download audio representation config file {audio_repr_id}")

        target_path = _symlink_downloaded_file(downloaded_path, audio_repr_dir, file_instance.basename)
        file_utils.write_to_console(console_file, [
            "Audio representation config downloaded and symlinked:",
            f"  - {os.path.basename(target_path)}",
            "\n",
        ])
        modeltrainer_logger.info(f"Audio representation config ready at {target_path}")
    except File.DoesNotExist:
        modeltrainer_logger.error(f"Audio representation File {audio_repr_id} not found")
        raise
    except Exception as e:
        modeltrainer_logger.error(f"Error preparing audio representation file: {e}")
        raise


def prepare_existing_model_if_requested(task_context: Dict[str, Any], file_utils: FileUtils) -> None:
    """
    If options.start_from_existing_model is True and a model file is present on the task,
    download and place it in the output folder under the target model name so training tools
    may continue from it if supported.
    """
    task: TrainingTask = task_context["task"]
    console_file = task_context["console_output_file"]
    model_dir = task_context["model_dir"]
    output_dir = task_context["output_dir"]

    options = task.options or {}
    start_from_existing = bool(options.get("start_from_existing_model", False))
    model_output_name = options.get("model_name") or f"trained_model_{task.id}.kt"

    if not start_from_existing:
        file_utils.write_to_console(console_file, [
            "Training will start from a clean slate (no existing model).",
            "\n",
        ])
        return

    if not task.model_file:
        file_utils.write_to_console(console_file, [
            "WARNING: start_from_existing_model=True but no existing model file is linked to the task.",
            "Proceeding to train from scratch.",
            "\n",
        ])
        modeltrainer_logger.warning(
            f"Task {task.id} requested start_from_existing_model but no model_file is set"
        )
        return

    try:
        downloaded_path = file_utils.download_file(task.model_file.id)
        if not downloaded_path:
            raise Exception(f"Failed to download existing model file {task.model_file.id}")

        # Symlink existing checkpoint into model_dir for visibility
        _symlink_downloaded_file(downloaded_path, model_dir, task.model_file.basename)

        # Copy to output folder under target name to maximize chances of resume support
        os.makedirs(output_dir, exist_ok=True)
        resume_target = os.path.join(output_dir, model_output_name)
        shutil.copy2(downloaded_path, resume_target)

        file_utils.write_to_console(console_file, [
            "Existing model prepared for resume:",
            f"  - Source: {task.model_file.basename}",
            f"  - Copied to: {model_output_name}",
            "\n",
        ])
        modeltrainer_logger.info(f"Existing model copied to {resume_target} for potential resume")
    except Exception as e:
        file_utils.write_to_console(console_file, [
            f"WARNING: Failed to prepare existing model for resume: {e}",
            "Training will proceed from scratch.",
            "\n",
        ])
        modeltrainer_logger.warning(f"Failed to prepare existing model for resume: {e}")


def construct_ketos_train_command(task_context: Dict[str, Any]) -> List[str]:
    task: TrainingTask = task_context["task"]
    local_path = task_context["local_path"]

    recipe_dir = task_context["recipe_dir"]
    dataset_dir = task_context["dataset_dir"]
    audio_repr_dir = task_context["audio_repr_dir"]
    output_dir = task_context["output_dir"]

    # Discover filenames (expect exactly one in each directory)
    def _first_file(path: str) -> str:
        files = os.listdir(path)
        if not files:
            raise Exception(f"No files found in {path}")
        return os.path.join(path, files[0])

    recipe_path = _first_file(recipe_dir)
    dataset_path = _first_file(dataset_dir)
    audio_repr_path = _first_file(audio_repr_dir)

    # Build base command (audio representation provided via flag per current CLI)
    command: List[str] = [
        "ketos-train",
        os.path.relpath(recipe_path, local_path),
        os.path.relpath(dataset_path, local_path),
    ]

    # Dataset config
    dataset_config = task.dataset_config or {}
    train_tables: List[str] = dataset_config.get("train", []) or []
    val_tables: List[str] = dataset_config.get("val", []) or []

    if train_tables:
        command.extend(["--train_table", *train_tables])
    if val_tables:
        command.extend(["--val_table", *val_tables])

    # Options
    options = task.options or {}
    epochs = options.get("epochs")
    seed = options.get("seed")
    batch_size = options.get("batch_size")
    checkpoints = options.get("checkpoints")
    custom_module = options.get("custom_module")  # Directory path if provided
    
    # Audio representation (current CLI expects --audio_representation)
    command.extend(["--audio_representation", os.path.relpath(audio_repr_path, local_path)])

    if batch_size is not None:
        if isinstance(batch_size, list):
            command.extend(["--batch_size", *[str(x) for x in batch_size]])
        else:
            command.extend(["--batch_size", str(batch_size)])
    if epochs is not None:
        command.extend(["--epochs", str(epochs)])
    if seed is not None:
        command.extend(["--seed", str(seed)])

    # Output settings
    os.makedirs(output_dir, exist_ok=True)
    command.extend(["--output_folder", os.path.relpath(output_dir, local_path)])

    model_output_name = options.get("model_name") or f"trained_model_{task.id}.kt"
    command.extend(["--model_output", model_output_name])

    if checkpoints is not None:
        command.extend(["--checkpoints", str(checkpoints)])
    if custom_module:
        command.extend(["--custom_module", custom_module])

    return command


def _copy_training_log_if_present(task_context: Dict[str, Any]) -> None:
    """
    If the training tool produced a training_log.csv in the output folder, copy it
    to the task root so the API's TrainingTask.get_log() can read it.
    """
    local_path = task_context["local_path"]
    output_dir = task_context["output_dir"]
    src = os.path.join(output_dir, "training_log.csv")
    dst = os.path.join(local_path, "training_log.csv")
    try:
        if os.path.exists(src):
            shutil.copy2(src, dst)
            modeltrainer_logger.info(f"Copied training log to {dst}")
    except Exception as e:
        modeltrainer_logger.warning(f"Failed to copy training log: {e}")


def upload_trained_model(task_context: Dict[str, Any], file_utils: FileUtils) -> Optional[File]:
    task: TrainingTask = task_context["task"]
    options = task.options or {}
    output_dir = task_context["output_dir"]

    model_output_name = options.get("model_name") or f"trained_model_{task.id}.kt"
    local_model_path = os.path.join(output_dir, model_output_name)

    if not os.path.exists(local_model_path):
        modeltrainer_logger.error(f"Expected trained model not found at {local_model_path}")
        return None

    structured_path = f"user_{task.user.id}/task_{task.id}/{model_output_name}"
    meta = {
        "task_id": task.id,
        "train_tables": (task.dataset_config or {}).get("train", []),
        "val_tables": (task.dataset_config or {}).get("val", []),
        "epochs": (task.options or {}).get("epochs"),
        "completed_at": timezone.now().isoformat(),
    }

    try:
        file_instance = file_utils.upload_file(
            local_file_path=local_model_path,
            maipl_folder="models",
            path=structured_path,
            meta=meta,
            user=task.user,
        )
        return file_instance
    except Exception as e:
        modeltrainer_logger.error(f"Failed to upload trained model: {e}")
        return None


@shared_task(bind=True, name='train_model')
def train_model(self, training_task_id: int):
    file_utils = FileUtils()
    task: Optional[TrainingTask] = None

    try:
        task = TrainingTask.objects.get(id=training_task_id)
        task.status = 'STARTED'
        task.save(update_fields=['status'])
        modeltrainer_logger.info(f"Training task {task.id} started")

        # Prepare workspace and inputs
        task_context = _create_training_workspace(task, file_utils)

        file_utils.write_to_console(task_context["console_output_file"], [
            f"Training task initialized (ID: {task.id})",
            f"Local path: {task_context['local_path']}",
            "\n",
        ])

        download_dataset_file(task_context, file_utils)
        download_recipe_file(task_context, file_utils)
        download_audio_representation_file(task_context, file_utils)
        prepare_existing_model_if_requested(task_context, file_utils)

        # Construct command
        command = construct_ketos_train_command(task_context)

        # Log the command and working directory
        file_utils.write_to_console(task_context["console_output_file"], [
            "Executing ketos-train command:",
            f"Command: {' '.join(command)}",
            f"Working directory: {task_context['local_path']}",
            "\n",
        ])
        modeltrainer_logger.info(f"ketos-train command: {' '.join(command)}")

        # Execute
        task.status = 'RUNNING'
        task.save(update_fields=['status'])

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                cwd=task_context["local_path"],
            )
        except FileNotFoundError:
            error_msg = (
                "ketos-train command not found. Ensure the Ketos toolkit is installed and in PATH."
            )
            file_utils.write_to_console(task_context["console_output_file"], [
                "ERROR: ketos-train command not found",
                "Please ensure the Ketos toolkit is properly installed and available in PATH",
                "\n",
            ])
            raise Exception(error_msg)

        # Console log of stdout/stderr
        file_utils.write_to_console(task_context["console_output_file"], [
            "Command execution completed:",
            f"Return code: {result.returncode}",
            "STDOUT:",
            result.stdout if result.stdout else "(no output)",
            "STDERR:",
            result.stderr if result.stderr else "(no errors)",
            "\n",
        ])

        if result.returncode != 0:
            task.status = 'FAILURE'
            task.save(update_fields=['status'])
            modeltrainer_logger.error(
                f"Training task {task.id} failed with return code {result.returncode}"
            )
            self.update_state(state=states.FAILURE, meta={'exc': result.stderr})
            raise Ignore()

        # Post-success handling
        _copy_training_log_if_present(task_context)
        file_instance = upload_trained_model(task_context, file_utils)
        if file_instance:
            task.model_file = file_instance
        task.status = 'SUCCESS'
        task.save(update_fields=['status', 'model_file'])
        modeltrainer_logger.info(f"Training task {task.id} completed successfully")

    except TrainingTask.DoesNotExist:
        modeltrainer_logger.error(f"Training task {training_task_id} not found")
        self.update_state(state=states.FAILURE, meta={'exc': 'Task not found'})
        raise Ignore()
    except Exception as e:
        modeltrainer_logger.error(f"An error occurred during training: {e}")
        self.update_state(state=states.FAILURE, meta={'exc': str(e)})
        if task:
            task.status = 'FAILURE'
            task.save(update_fields=['status'])
        raise Ignore()
    finally:
        # Optional cleanup hook: replicate modelrunner pattern if needed
        try:
            shutil.rmtree('/backend/kt-tmp/', ignore_errors=True)
        except Exception:
            pass


