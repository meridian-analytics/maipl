import csv
import os
import re
import shutil
import subprocess
from datetime import datetime
from os.path import basename, splitext

from celery import shared_task, states
from celery.exceptions import Ignore
from django.contrib.auth import get_user_model

from common.logger import modelrunner_logger
from common.file_utils import FileUtils

from .models import Detection, ModelRunnerTask
from file.models import File

User = get_user_model()


def sanitize_folder_name(name):
    """
    Sanitize a string to be used as a folder name.
    Removes or replaces problematic characters for file system paths.
    
    Args:
        name: String to sanitize
        
    Returns:
        str: Sanitized folder name
    """
    if not name:
        return "unknown"
    # Remove or replace problematic characters
    # Replace spaces, slashes, and other problematic chars with underscores
    sanitized = re.sub(r'[^\w\-_\.]', '_', str(name))
    # Remove consecutive underscores and leading/trailing underscores
    sanitized = re.sub(r'_+', '_', sanitized).strip('_')
    # Limit length to avoid filesystem issues
    if len(sanitized) > 100:
        sanitized = sanitized[:100]
    return sanitized if sanitized else "unknown"


def generate_detections_filepath(task):
    """
    Generate a folder-structured filepath for detection files.
    
    Structure: detections/task-{task_id}-{model_name}/detections.csv
    This is the main unfiltered detection file from the model run.
    The 'detections' prefix separates detection files from other annotations.
    Task ID is unique, so date is not needed. Model name helps identify the model used.
    
    Args:
        task: ModelRunnerTask instance
        
    Returns:
        str: Filepath for the detection file
    """
    task_id = task.id
    
    # Get model name from model_file
    if task.model_file:
        model_basename = task.model_file.basename
        model_name = splitext(model_basename)[0]  # Remove extension
        model_name = sanitize_folder_name(model_name)
    else:
        model_name = "unknown_model"
    
    # Build folder-structured path - task ID and model name (no date needed since task IDs are unique)
    filepath = f"detections/task-{task_id}-{model_name}/detections.csv"
    
    return filepath


@shared_task(bind=True, name='run_model')
def run_model(self, model_task_id):
    try:
        model_task = ModelRunnerTask.objects.get(id=model_task_id)
        model_task.status = 'STARTED'
        model_task.save()
        modelrunner_logger.info(f"Model Runner task {model_task.id} started")

        file_utils = FileUtils()
        task_context = {
            "task": model_task,
            "local_path": file_utils.create_local_path(model_task, "runner"),
            "console_output_file": file_utils.create_console_output_file(model_task),
        }

        download_audio_files(task_context, file_utils)
        download_model_file(task_context, file_utils)

        command = construct_command_with_model_parameters(task_context)

        model_task.status = 'RUNNING'
        model_task.save()
        
        # run the command from the audios_database directory so filenames in CSV are relative to that folder
        audios_database_dir = task_context.get("audios_database_dir")
        if not audios_database_dir:
            raise Exception("Audios database directory not found in task context")
        
        result = subprocess.run(command, capture_output=True, text=True, cwd=audios_database_dir)
        
        # Optimize console logging like dbtool
        file_utils.write_to_console(task_context["console_output_file"], [
            "Command execution completed:",
            f"Return code: {result.returncode}",
            "STDOUT:",
            result.stdout if result.stdout else "(no output)",
            "STDERR:",
            result.stderr if result.stderr else "(no errors)",
            "\n"
        ])

        if result.returncode == 0:
            save_detections_to_db(task_context)
            file_instance = upload_detections_file(task_context, file_utils)
            model_task.detections = file_instance
            attach_meta_data_to_detections(file_instance)
            model_task.status = 'SUCCESS'
            model_task.save()
        else:
            model_task.status = 'FAILURE'
            model_task.save()
            modelrunner_logger.error(f"Model task {model_task.id} failed with return code {result.returncode}")

    except Exception as e:
        modelrunner_logger.error(f"An error occurred during model run: {e}")
        self.update_state(state=states.FAILURE, meta={'exc': e})
        model_task.status = 'FAILURE'
        model_task.save()
        raise Ignore()

    finally:
        modelrunner_logger.info("Cleaning up files")
        shutil.rmtree('/backend/kt-tmp/', ignore_errors=True)
        modelrunner_logger.info("Files cleaned up")

def download_audio_files(task_context, file_utils):
    """
    Download audio files and reconstruct directory structure using file.path.
    
    Args:
        task_context: Dictionary containing task context
        file_utils: FileUtils instance for file operations
    """
    filelist = task_context["task"].filelist.all()
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    
    # Create audios_database directory (similar to dbtool pattern)
    audios_database_dir = os.path.join(local_path, "audios_database")
    os.makedirs(audios_database_dir, exist_ok=True)
    
    downloaded_files = []
    
    for file in filelist:
        try:
            # Download file to NFS server
            downloaded_path = file_utils.download_file(file.id)
            if not downloaded_path:
                modelrunner_logger.error(f"Failed to download file {file.id}")
                continue
            
            # Reconstruct directory structure using file.path (like dbtool)
            # Remove leading slash if present
            relative_path = file.path.lstrip('/')
            
            # Create full directory structure
            target_dir = os.path.join(audios_database_dir, os.path.dirname(relative_path))
            os.makedirs(target_dir, exist_ok=True)
            
            # Create symbolic link
            target_path = os.path.join(target_dir, file.basename)
            if os.path.exists(target_path):
                os.remove(target_path)  # Remove existing link if present
            
            os.symlink(downloaded_path, target_path)
            downloaded_files.append(target_path)
            
            modelrunner_logger.info(f"Downloaded and symlinked audio file: {target_path}")
            
        except Exception as e:
            modelrunner_logger.error(f"Error downloading file {file.id}: {e}")
    
    # Write audio files info to console output (optimized like dbtool)
    file_utils.write_to_console(console_output_file, [
        "Audio files downloaded and symlinked:",
        f"Total files: {len(downloaded_files)}",
        *[f"  - {os.path.relpath(f, audios_database_dir)}" for f in downloaded_files],
        "\n"
    ])
    
    task_context["audios_database_dir"] = audios_database_dir

def download_model_file(task_context, file_utils):
    """
    Download model file and create symbolic link in model folder.
    
    Args:
        task_context: Dictionary containing task context
        file_utils: FileUtils instance for file operations
    """
    model_file = task_context["task"].model_file
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    
    # Create model directory
    model_dir = os.path.join(local_path, "model")
    os.makedirs(model_dir, exist_ok=True)
    
    try:
        # Download file to NFS server
        downloaded_path = file_utils.download_file(model_file.id)
        if not downloaded_path:
            modelrunner_logger.error(f"Failed to download model file {model_file.id}")
            return
        
        # Create symbolic link
        target_path = os.path.join(model_dir, model_file.basename)
        if os.path.exists(target_path):
            os.remove(target_path)  # Remove existing link if present
        
        os.symlink(downloaded_path, target_path)
        
        modelrunner_logger.info(f"Downloaded and symlinked model file: {target_path}")
        
        # Write model file info to console output (optimized like dbtool)
        file_utils.write_to_console(console_output_file, [
            "Model file downloaded and symlinked:",
            f"  - {model_file.basename}",
            "\n"
        ])
        
        task_context["model_dir"] = model_dir
        
    except Exception as e:
        modelrunner_logger.error(f"Error downloading model file {model_file.id}: {e}")

def construct_command_with_model_parameters(task_context):
    """
    Construct the ketos-run command based on model task configuration.
    
    Working Directory Strategy:
    - Command will be executed from the audios_database directory
    - Audio file paths in the command use relative paths from audios_database
    - Model file and output folder use absolute paths
    - This ensures CSV filenames are relative to audios_database (e.g., user_2/task_24/beluga_database.h5)
    
    Args:
        task_context: Dictionary containing task context
        
    Returns:
        List containing the command and arguments
    """
    model_task = task_context["task"]
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    
    # Create detections directory
    detections_dir = os.path.join(local_path, "detections")
    os.makedirs(detections_dir, exist_ok=True)
    task_context["detections_dir"] = detections_dir

    # Base command
    command = ['ketos-run']
    
    # Add model file (absolute path since we're running from audios_database directory)
    model_dir = task_context.get("model_dir")
    if not model_dir:
        raise Exception("Model directory not found in task context. This usually means the model file download failed.")
    
    # Get the absolute path to model file
    model_file_abs = os.path.join(model_dir, model_task.model_file.basename)
    command.append(model_file_abs)
    
    # Add audio input (relative paths from audios_database directory)
    audios_database_dir = task_context.get("audios_database_dir")
    if not audios_database_dir:
        raise Exception("Audios database directory not found in task context. This usually means the audio files download failed.")
    
    # Check if we have a database file or audio files
    filelist = model_task.filelist.all()
    h5_files = [f for f in filelist if f.path.endswith('.h5')]
    audio_files = os.listdir(audios_database_dir)
    modelrunner_logger.info(f"Audio files found in {audios_database_dir}: {audio_files}")
    modelrunner_logger.info(f"H5 files in filelist: {[f.path for f in h5_files]}")
    
    if len(h5_files) == 1:
        # Single database file - use the relative path from audios_database directory
        h5_file = h5_files[0]
        relative_path = h5_file.path.lstrip('/')
        command.append(relative_path)
        modelrunner_logger.info(f"Using database file: {relative_path}")
    else:
        # Multiple audio files - use current directory (.)
        command.append('.')
        modelrunner_logger.info(f"Using audio files from current directory")

    # Add output folder (absolute path since we're running from audios_database directory)
    detections_dir_abs = os.path.abspath(detections_dir)
    command.extend(['--output_folder', detections_dir_abs])

    # adding optional arguments from the model task parameters
    parameters = model_task.parameters
    if parameters.get('threshold', 0.0) != 0.0:
        command += ['--threshold', f"{parameters.get('threshold')}"]
    if parameters.get('step_size', 0) != 0:
        command += ['--step_size', f"{parameters.get('step_size')}"]
    if parameters.get('batch_size', 0) != 0:
        command += ['--batch_size', f"{parameters.get('batch_size')}"]
    if parameters.get('buffer', 0.0) != 0.0:
        command += ['--buffer', f"{parameters.get('buffer')}"]
    if parameters.get('table_name', '/') != '/':
        command += ['--table_name', f"{parameters.get('table_name')}"]

    # write the command to the console output (optimized like dbtool)
    file_utils = FileUtils()
    file_utils.write_to_console(console_output_file, [
        "Command for running the model:",
        f"  {' '.join(command)}",
        f"Working directory: {audios_database_dir}",
        "\n"
    ])

    return command


def save_detections_to_db(task_context):
    """
    Save detections to database.
    
    Since we're reconstructing the original file structure in the audios_database folder,
    the CSV already contains the correct relative paths and we can process it directly.
    """
    model_task = task_context["task"]
    detections_dir = task_context["detections_dir"]
    user = User.objects.get(id=model_task.user_id.id)

    # get the local file path for the detections.csv
    local_file_path = os.path.join(detections_dir, "detections.csv")

    try:
        with open(local_file_path, 'r') as f:
            reader = csv.reader(f)
            next(reader, None)  # skip the header

            for row in reader:
                if not row:  # ensure row is not empty
                    continue
                    
                filename = row[0]  # Use the full relative path from CSV
                start = float(row[1])
                end = float(row[2])
                label = row[3]
                score = round(float(row[4]), 3)

                try:
                    detection = Detection(
                        filename=filename,  # Store the relative path as-is
                        start=start,
                        end=end,
                        score=score,
                        label=label,
                        task=model_task,
                        user_id=user
                    )
                    detection.save()
                except Exception as e:
                    modelrunner_logger.error(f"An error occurred saving detection: {e}")
                    continue

        modelrunner_logger.info(f"Successfully saved detections to database")
        
        # Update task status to SUCCESS
        model_task.status = 'SUCCESS'
        model_task.save()
        modelrunner_logger.info(f"Updated task {model_task.id} status to SUCCESS")

    except FileNotFoundError as fnf_error:
        modelrunner_logger.exception("File not found error: %s", fnf_error)
        model_task.status = 'FAILURE'
        model_task.save()
    except Exception as e:
        modelrunner_logger.exception("An error occurred: %s", e)
        model_task.status = 'FAILURE'
        model_task.save()


def upload_detections_file(task_context, file_utils):
    """Upload the detections file to storage with folder structure."""
    detections_dir = task_context["detections_dir"]
    local_file_path = os.path.join(detections_dir, "detections.csv")
    task = task_context["task"]
    
    # Generate folder-structured filepath
    filepath = generate_detections_filepath(task)
    
    # Upload the file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_instance = file_utils.upload_file(
        local_file_path=local_file_path,
        maipl_folder='annotations',
        path=filepath,
        meta={
            'task_id': task.id,
            'upload_time': timestamp,
            'file_count': len(task.filelist.all()),
            'model_name': task.model_file.basename if task.model_file else None,
            'created_at': task.created_at.isoformat() if task.created_at else None
        },
        user=task.user_id  # Pass the User instance directly
    )
    
    return file_instance
    

def attach_meta_data_to_detections(file_instance):
    model_meta_data = {}
    files = ['/backend/kt-tmp/audio_repr.json',
             '/backend/kt-tmp/metadata.yaml'
             '/backend/kt-tmp/recipe.json',
             '/backend/kt-tmp/labels.json', 
             ]
    keys = ['audio_repr', 'metadata', 'recipe', 'labels']

    for file, key in zip(files, keys):
        if os.path.exists(file):
            with open(file) as f:
                model_meta_data[key] = f.read()
        else:
            model_meta_data[key] = None

    file_instance.meta = model_meta_data
    file_instance.save()


        
