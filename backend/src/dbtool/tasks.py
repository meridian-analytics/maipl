import logging
import os
import shutil
import subprocess
from typing import Optional, Dict, Any
import time
import hashlib

from celery import shared_task
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

from common.logger import dbtool_logger
from common.file_utils import FileUtils
from common.shared_file_cache import shared_file_cache
from common.h5_metadata import extract_h5_metadata_from_file
from dbtool.models import DatabaseTask, DatabaseGroup
from file.models import File

logger = logging.getLogger(__name__)


def update_task_and_group_status(
    task_id: int, 
    group_id: int, 
    task_status: str = 'in_progress',
    group_status: str = 'in_progress',
    celery_task_id: Optional[str] = None
) -> bool:
    """
    Update the status of both the database task and the specific group.
    
    Args:
        task_id: ID of the database task
        group_id: ID of the database group
        task_status: New status for the task
        group_status: New status for the group
        celery_task_id: Optional celery task ID to store
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    try:
        with transaction.atomic():
            # Update task status
            task = DatabaseTask.objects.select_for_update().get(id=task_id)
            task.status = task_status
            if celery_task_id:
                task.celery_task_id = celery_task_id
            task.save(update_fields=['status', 'celery_task_id'])
            
            # Update group status
            group = DatabaseGroup.objects.select_for_update().get(id=group_id)
            group.status = group_status
            if celery_task_id:
                group.celery_task_id = celery_task_id
            group.save(update_fields=['status', 'celery_task_id'])
            
            dbtool_logger.info(f"Updated task {task_id} status to '{task_status}' and group {group_id} status to '{group_status}'")
            return True
            
    except DatabaseTask.DoesNotExist:
        dbtool_logger.error(f"Database task {task_id} not found")
        return False
    except DatabaseGroup.DoesNotExist:
        dbtool_logger.error(f"Database group {group_id} not found")
        return False
    except Exception as e:
        dbtool_logger.error(f"Error updating task {task_id} and group {group_id} status: {e}")
        return False


def start_database_processing_task(task_id: int, group_id: int) -> Optional[str]:
    """
    Start a celery task to process the database group.
    
    Args:
        task_id: ID of the database task
        group_id: ID of the database group to process
        
    Returns:
        str: Celery task ID if successful, None otherwise
    """
    try:
        # Update status to indicate processing is starting
        if not update_task_and_group_status(task_id, group_id, 'in_progress', 'in_progress'):
            return None
        
        # Start the celery task
        celery_task = process_database_group.delay(task_id, group_id)
        
        # Update with the celery task ID
        update_task_and_group_status(task_id, group_id, 'in_progress', 'in_progress', celery_task.id)
        
        dbtool_logger.info(f"Started database processing task {celery_task.id} for task {task_id}, group {group_id}")
        return celery_task.id
        
    except Exception as e:
        dbtool_logger.error(f"Error starting database processing task for task {task_id}, group {group_id}: {e}")
        # Update status to failed
        update_task_and_group_status(task_id, group_id, 'failed', 'failed')
        return None


@shared_task(bind=True, name='dbtool.process_database_group')
def process_database_group(self, task_id: int, group_id: int) -> Dict[str, Any]:
    """
    Celery task to process a database group.
    
    Implements the three-step database processing logic:
    1. Create local folder for task content
    2. Setup console output file for step recording
    3. Download files to NFS server and create symbolic links
    
    Args:
        task_id: ID of the database task
        group_id: ID of the database group to process
        
    Returns:
        Dict containing processing results
    """
    try:
        dbtool_logger.info(f"Starting database group processing for task {task_id}, group {group_id}")
        
        # Get the task and group
        task = DatabaseTask.objects.get(id=task_id)
        group = DatabaseGroup.objects.get(id=group_id)
        
        # Step 1: Create local folder for task content
        file_utils = FileUtils()
        local_path = file_utils.create_local_path(task, "database")
        if not local_path:
            raise Exception("Failed to create local path for task")
        
        # Step 2: Setup console output file for step recording (group-specific)
        console_output_file = create_group_console_output_file(task, group, local_path)
        if not console_output_file:
            raise Exception("Failed to create console output file")
        
        # Create task context for processing
        task_context = {
            "task": task,
            "group": group,
            "local_path": local_path,
            "console_output_file": console_output_file,
        }
        
        # Step 3: Download files and create symbolic links
        download_audio_files(task_context, file_utils)
        download_config_file(task_context, file_utils)
        download_annotation_file(task_context, file_utils)
        download_database_file(task_context, file_utils)
        
        # Log completion of setup phase
        file_utils.write_to_console(console_output_file, [
            "Database processing setup completed successfully",
            f"Local path: {local_path}",
            f"Group ID: {group_id}",
            f"Audio files: {len(os.listdir(os.path.join(local_path, f'audio_{group_id}')))} files",
            f"Audio representation config file: {'config' if os.path.exists(os.path.join(local_path, f'config_{group_id}')) else 'None'}",
            f"Annotation file: {'annotation' if os.path.exists(os.path.join(local_path, f'annotation_{group_id}')) else 'None'}",
            f"Database file: {'database' if os.path.exists(os.path.join(local_path, 'database')) else 'None'}",
            "\n"
        ])
        
        # Step 4: Implement actual database processing logic
        # This involves:
        # 1. Creating the output directory
        # 2. Handling existing vs. new database scenarios
        # 3. Running ketos-create-db command
        # 4. Uploading/updating the database in storage
        # 5. Cleaning up cached files to prevent stale cache issues
        processing_result = process_database_with_ketos(task_context, file_utils)
        
        # Update group statistics with processing results
        update_group_statistics(group_id, processing_result)
        
        # Mark processing as completed
        update_task_and_group_status(task_id, group_id, 'completed', 'completed')
        
        dbtool_logger.info(f"Completed database group processing for task {task_id}, group {group_id}")
        
        return processing_result
        
    except DatabaseTask.DoesNotExist:
        error_msg = f"Database task {task_id} not found"
        dbtool_logger.error(error_msg)
        update_task_and_group_status(task_id, group_id, 'failed', 'failed')
        raise self.retry(countdown=60, max_retries=3, exc=Exception(error_msg))
        
    except DatabaseGroup.DoesNotExist:
        error_msg = f"Database group {group_id} not found"
        dbtool_logger.error(error_msg)
        update_task_and_group_status(task_id, group_id, 'failed', 'failed')
        raise self.retry(countdown=60, max_retries=3, exc=Exception(error_msg))
        
    except Exception as e:
        error_msg = f"Error processing database group {group_id} for task {task_id}: {e}"
        dbtool_logger.error(error_msg)
        update_task_and_group_status(task_id, group_id, 'failed', 'failed')
        raise self.retry(countdown=60, max_retries=3, exc=e)


def download_audio_files(task_context: Dict[str, Any], file_utils: FileUtils) -> None:
    """
    Download audio files and reconstruct directory structure using file.path.
    
    Args:
        task_context: Dictionary containing task context
        file_utils: FileUtils instance for file operations
    """
    group = task_context["group"]
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    
    # Get audio file IDs from group config
    audio_file_ids = group.config.get('audio_file_ids', [])
    
    if not audio_file_ids:
        file_utils.write_to_console(console_output_file, [
            "No audio files found in group config",
            "\n"
        ])
        return
    
    # Create group-specific audio directory
    audio_dir = os.path.join(local_path, f"audio_{group.id}")
    os.makedirs(audio_dir, exist_ok=True)
    
    downloaded_files = []
    
    for file_id in audio_file_ids:
        try:
            # Get file instance
            file_instance = File.objects.get(id=file_id)
            
            # Download file to NFS server
            downloaded_path = file_utils.download_file(file_id)
            if not downloaded_path:
                dbtool_logger.error(f"Failed to download file {file_id}")
                continue
            
            # Reconstruct directory structure using file.path
            # Remove leading slash if present
            relative_path = file_instance.path.lstrip('/')
            
            # Create full directory structure
            target_dir = os.path.join(audio_dir, os.path.dirname(relative_path))
            os.makedirs(target_dir, exist_ok=True)
            
            # Create symbolic link
            target_path = os.path.join(target_dir, file_instance.basename)
            if os.path.exists(target_path):
                os.remove(target_path)  # Remove existing link if present
            
            os.symlink(downloaded_path, target_path)
            downloaded_files.append(target_path)
            
            dbtool_logger.info(f"Downloaded and symlinked audio file: {target_path}")
            
        except File.DoesNotExist:
            dbtool_logger.error(f"File {file_id} not found in database")
        except Exception as e:
            dbtool_logger.error(f"Error downloading file {file_id}: {e}")
    
    # Write audio files info to console output
    file_utils.write_to_console(console_output_file, [
        "Audio files downloaded and symlinked:",
        f"Total files: {len(downloaded_files)}",
        *[f"  - {os.path.relpath(f, audio_dir)}" for f in downloaded_files],
        "\n"
    ])
    
    task_context["audio_dir"] = audio_dir


def download_config_file(task_context: Dict[str, Any], file_utils: FileUtils) -> None:
    """
    Download audio representation config file and create symbolic link in config folder.
    
    Args:
        task_context: Dictionary containing task context
        file_utils: FileUtils instance for file operations
    """
    group = task_context["group"]
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    
    # Get audio representation config file ID from group config
    config_file_id = group.audio_representation_config_id
    
    if not config_file_id:
        error_msg = "No audio representation config file found in group config"
        file_utils.write_to_console(console_output_file, [
            f"ERROR: {error_msg}",
            "A database group must have an audio representation config file to proceed",
            "\n"
        ])
        raise Exception(error_msg)
    
    try:
        # Get file instance
        file_instance = File.objects.get(id=config_file_id)
        
        # Download file to NFS server
        downloaded_path = file_utils.download_file(config_file_id)
        if not downloaded_path:
            dbtool_logger.error(f"Failed to download audio representation config file {config_file_id}")
            return
        
        # Create group-specific config directory
        config_dir = os.path.join(local_path, f"config_{group.id}")
        os.makedirs(config_dir, exist_ok=True)
        
        # Create symbolic link
        target_path = os.path.join(config_dir, file_instance.basename)
        if os.path.exists(target_path):
            os.remove(target_path)  # Remove existing link if present
        
        os.symlink(downloaded_path, target_path)
        
        dbtool_logger.info(f"Downloaded and symlinked audio representation config file: {target_path}")
        
        # Write config file info to console output
        file_utils.write_to_console(console_output_file, [
            "Audio representation config file downloaded and symlinked:",
            f"  - {file_instance.basename}",
            "\n"
        ])
        
        task_context["config_dir"] = config_dir
        
    except File.DoesNotExist:
        dbtool_logger.error(f"Audio representation config file {config_file_id} not found in database")
    except Exception as e:
        dbtool_logger.error(f"Error downloading audio representation config file {config_file_id}: {e}")


def download_annotation_file(task_context: Dict[str, Any], file_utils: FileUtils) -> None:
    """
    Download annotation file and create symbolic link in annotation folder.
    
    Args:
        task_context: Dictionary containing task context
        file_utils: FileUtils instance for file operations
    """
    group = task_context["group"]
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    
    # Get annotation file ID from group config
    config = group.config
    annotations_file_id = config.get('annotations', {}).get('file_id')
    
    if not annotations_file_id:
        # No annotations file to download
        return
    
    try:
        # Get file instance
        file_instance = File.objects.get(id=annotations_file_id)
        
        # Download file to NFS server
        downloaded_path = file_utils.download_file(annotations_file_id)
        if not downloaded_path:
            dbtool_logger.error(f"Failed to download annotation file {annotations_file_id}")
            return
        
        # Create group-specific annotation directory
        annotation_dir = os.path.join(local_path, f"annotation_{group.id}")
        os.makedirs(annotation_dir, exist_ok=True)
        
        # Create symbolic link
        target_path = os.path.join(annotation_dir, file_instance.basename)
        if os.path.exists(target_path):
            os.remove(target_path)  # Remove existing link if present
        
        os.symlink(downloaded_path, target_path)
        
        dbtool_logger.info(f"Downloaded and symlinked annotation file: {target_path}")
        
        # Write annotation file info to console output
        file_utils.write_to_console(console_output_file, [
            "Annotation file downloaded and symlinked:",
            f"  - {file_instance.basename}",
            "\n"
        ])
        
        task_context["annotation_dir"] = annotation_dir
        
    except File.DoesNotExist:
        dbtool_logger.error(f"Annotation file {annotations_file_id} not found in database")
    except Exception as e:
        dbtool_logger.error(f"Error downloading annotation file {annotations_file_id}: {e}")


def create_group_console_output_file(task: DatabaseTask, group: DatabaseGroup, local_path: str) -> Optional[str]:
    """
    Create a group-specific console output file for the task.
    
    Args:
        task: The task instance
        group: The group instance
        local_path: The local path for the task
        
    Returns:
        str: Path to the console output file if successful, None otherwise
    """
    group_id = group.id
    
    # Create console output directory for this group
    console_dir = os.path.join(local_path, "console_output", str(group_id))
    os.makedirs(console_dir, exist_ok=True)
    
    file_path = os.path.join(console_dir, "console.txt")
    try:
        with open(file_path, "w") as f:
            f.write(f"Task {task.id} - Group {group_id} started.......\n")
            f.write(f"Group name: {group.name}\n")
            f.write(f"Group source: {group.source}\n")
            f.write("=" * 50 + "\n")
        return file_path
    except Exception as e:
        dbtool_logger.error(f"Failed to create console output file for group {group_id}: {e}")
        return None


def download_database_file(task_context: Dict[str, Any], file_utils: FileUtils) -> None:
    """
    Download database file (if any) and create symbolic link in database folder.
    
    Args:
        task_context: Dictionary containing task context
        file_utils: FileUtils instance for file operations
    """
    task = task_context["task"]
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    
    # Check if task has an existing database file
    if not task.database_file:
        file_utils.write_to_console(console_output_file, [
            "No existing database file found for task",
            "\n"
        ])
        return
    
    # Check if we already have the database file locally (from previous groups)
    database_dir = os.path.join(local_path, "database")
    local_database_path = os.path.join(database_dir, task.database_file.basename)
    
    if os.path.exists(local_database_path):
        # Database file already exists locally, no need to download again
        file_utils.write_to_console(console_output_file, [
            "Database file already exists locally (from previous group processing)",
            f"  - {task.database_file.basename}",
            "No need to download again",
            "\n"
        ])
        
        task_context["database_dir"] = database_dir
        dbtool_logger.info(f"Using existing local database file: {local_database_path}")
        return
    
    try:
        # Download file to NFS server
        downloaded_path = file_utils.download_file(task.database_file.id)
        if not downloaded_path:
            dbtool_logger.error(f"Failed to download database file {task.database_file.id}")
            return
        
        # Create database directory
        os.makedirs(database_dir, exist_ok=True)
        
        # Create symbolic link
        target_path = os.path.join(database_dir, task.database_file.basename)
        if os.path.exists(target_path):
            os.remove(target_path)  # Remove existing link if present
        
        os.symlink(downloaded_path, target_path)
        
        dbtool_logger.info(f"Downloaded and symlinked database file: {target_path}")
        
        # Write database file info to console output
        file_utils.write_to_console(console_output_file, [
            "Database file downloaded and symlinked:",
            f"  - {task.database_file.basename}",
            "\n"
        ])
        
        task_context["database_dir"] = database_dir
        
    except Exception as e:
        dbtool_logger.error(f"Error downloading database file {task.database_file.id}: {e}")


def process_database_with_ketos(task_context: Dict[str, Any], file_utils: FileUtils) -> Dict[str, Any]:
    """
    Process the database using ketos-create-db command-line tool.
    
    Args:
        task_context: Dictionary containing task context
        file_utils: FileUtils instance for file operations
        
    Returns:
        Dict containing processing results
    """
    task = task_context["task"]
    group = task_context["group"]
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    
    # Create output directory for the generated database
    output_dir = os.path.join(local_path, "output")
    os.makedirs(output_dir, exist_ok=True)
    
    # Determine database filename from task output settings
    database_filename = task.output_settings.get('database_filename', f"database_{task.id}.h5")
    output_path = os.path.join(output_dir, database_filename)
    
    # Check if we have a selected database to copy from
    has_selected_database = task.database_selection.get('mode') == 'use_existing' and task.database_selection.get('database_file_id')
    
    # Additional safety check: if this is not the first group, we should be very careful
    is_first_group = group.id == task.groups.order_by('id').first().id if task.groups.exists() else True
    
    file_utils.write_to_console(console_output_file, [
        f"Database processing strategy:",
        f"Task ID: {task.id}",
        f"Group ID: {group.id}",
        f"Group Name: {group.name}",
        f"Has selected database: {has_selected_database}",
        f"Is first group: {is_first_group}",
        f"Database filename: {database_filename} (from task output settings)",
        f"Output path: {output_path}",
        "\n"
    ])
    
    # Safety warning if this might not be the first group
    if not is_first_group and not has_selected_database:
        dbtool_logger.warning(f"Group {group.id} is not the first group but task has no selected database. This might indicate a problem.")
        file_utils.write_to_console(console_output_file, [
            "WARNING: This group is not the first group but no selected database is configured.",
            "This might indicate that previous groups failed or were not properly processed.",
            "\n"
        ])
    
    if has_selected_database:
        # Check if this is the first group (when we need to start with the selected database)
        if is_first_group:
            # Scenario 1: First group with selected database - copy it to output to start fresh
            selected_database_id = task.database_selection.get('database_file_id')
            file_utils.write_to_console(console_output_file, [
                "First group with selected database - copying to output directory to start fresh",
                f"Selected database ID: {selected_database_id}",
                f"Target: {database_filename}",
                "\n"
            ])
            
            # Download and copy selected database to output directory
            try:
                downloaded_path = file_utils.download_file(selected_database_id)
                if downloaded_path:
                    shutil.copy2(downloaded_path, output_path)
                    dbtool_logger.info(f"Downloaded and copied selected database to {output_path} for first group")
                else:
                    raise Exception(f"Failed to download selected database file {selected_database_id}")
            except Exception as e:
                raise Exception(f"Failed to access selected database file {selected_database_id}: {e}")
        else:
            # Scenario 2: Subsequent group - check if we already have a working database in output
            if os.path.exists(output_path):
                # Check if the file has actual content (not just an empty file)
                file_size = os.path.getsize(output_path)
                if file_size > 1024:  # Assume files smaller than 1KB are empty/invalid
                    file_utils.write_to_console(console_output_file, [
                        "Subsequent group - using existing working database in output directory",
                        f"Will append to: {database_filename}",
                        f"File size: {file_size} bytes",
                        "\n"
                    ])
                    dbtool_logger.info(f"Using existing working database: {output_path} ({file_size} bytes)")
                else:
                    file_utils.write_to_console(console_output_file, [
                        "Working database appears to be empty/invalid - copying selected database",
                        f"Target: {database_filename}",
                        "\n"
                    ])
                    # Download and copy selected database since working database is invalid
                    selected_database_id = task.database_selection.get('database_file_id')
                    try:
                        downloaded_path = file_utils.download_file(selected_database_id)
                        if downloaded_path:
                            shutil.copy2(downloaded_path, output_path)
                            dbtool_logger.info(f"Downloaded and copied selected database to {output_path} due to invalid working database")
                        else:
                            raise Exception(f"Failed to download selected database file {selected_database_id}")
                    except Exception as e:
                        raise Exception(f"Failed to access selected database file {selected_database_id}: {e}")
            else:
                # No working database found - this shouldn't happen for subsequent groups
                file_utils.write_to_console(console_output_file, [
                    "WARNING: No working database found for subsequent group",
                    "This indicates a problem with previous group processing",
                    "Copying selected database as fallback",
                    "\n"
                ])
                # Download and copy selected database as fallback
                selected_database_id = task.database_selection.get('database_file_id')
                try:
                    downloaded_path = file_utils.download_file(selected_database_id)
                    if downloaded_path:
                        shutil.copy2(downloaded_path, output_path)
                        dbtool_logger.info(f"Downloaded and copied selected database to {output_path} as fallback for subsequent group")
                    else:
                        raise Exception(f"Failed to download selected database file {selected_database_id}")
                except Exception as e:
                    raise Exception(f"Failed to access selected database file {selected_database_id}: {e}")
    else:
        # Scenario 3: No selected database - check if we already have a database file in output from previous groups
        if os.path.exists(output_path):
            # Check if the file has actual content (not just an empty file)
            file_size = os.path.getsize(output_path)
            if file_size > 1024:  # Assume files smaller than 1KB are empty/invalid
                file_utils.write_to_console(console_output_file, [
                    "Found existing working database in output directory from previous groups",
                    f"Will append to: {database_filename}",
                    f"File size: {file_size} bytes",
                    "\n"
                ])
                has_selected_database = True  # Update flag to treat as having selected database
                dbtool_logger.info(f"Detected existing working database file with content: {output_path} ({file_size} bytes)")
            else:
                file_utils.write_to_console(console_output_file, [
                    "Found existing database file but it appears to be empty/invalid",
                    f"Will create new database: {database_filename}",
                    f"File size: {file_size} bytes",
                    "\n"
                ])
                # Remove the empty/invalid file and create new
                os.remove(output_path)
                has_existing_database = False
        else:
            file_utils.write_to_console(console_output_file, [
                "Creating new database file from scratch",
                f"Output: {database_filename}",
                "\n"
            ])
    
    # Construct ketos-create-db command
    # Note: has_existing_database is used for logging but doesn't affect command construction
    command = construct_ketos_create_db_command(task_context, output_path)
    
    # Log the command being executed
    file_utils.write_to_console(console_output_file, [
        "Executing ketos-create-db command:",
        f"Command: {' '.join(command)}",
        "\n"
    ])
    
    # Execute the command
    start_time = timezone.now()
    try:
        result = subprocess.run(command, capture_output=True, text=True, cwd=local_path)
    except FileNotFoundError:
        error_msg = "ketos-create-db command not found. Please ensure the Ketos toolkit is properly installed."
        file_utils.write_to_console(console_output_file, [
            "ERROR: ketos-create-db command not found",
            "Please ensure the Ketos toolkit is properly installed and available in PATH",
            "\n"
        ])
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"Failed to execute ketos-create-db command: {e}"
        file_utils.write_to_console(console_output_file, [
            f"ERROR: {error_msg}",
            "\n"
        ])
        raise Exception(error_msg)
    
    end_time = timezone.now()
    
    # Log command output
    file_utils.write_to_console(console_output_file, [
        "Command execution completed:",
        f"Return code: {result.returncode}",
        "STDOUT:",
        result.stdout if result.stdout else "(no output)",
        "STDERR:",
        result.stderr if result.stderr else "(no errors)",
        "\n"
    ])
    
    # Check if command was successful
    if result.returncode != 0:
        error_msg = f"ketos-create-db command failed with return code {result.returncode}"
        if result.stderr:
            error_msg += f": {result.stderr}"
        raise Exception(error_msg)
    
    # Verify the output database was created
    if not os.path.exists(output_path):
        raise Exception(f"Expected output database {output_path} was not created")
    
    # Get file size and other metadata
    file_size = os.path.getsize(output_path)
    dbtool_logger.info(f"Database created successfully: {output_path} ({file_size} bytes)")
    
    # Upload the generated database to minio storage
    database_file_instance = upload_database_to_storage(
        output_path, database_filename, task, group, file_utils, console_output_file
    )
    
    # Link the database file to the task
    if not has_selected_database and not task.database_file:
        # For completely new databases (first group), set this as the task's database file
        if database_file_instance:
            task.database_file = database_file_instance
            task.save(update_fields=['database_file'])
            dbtool_logger.info(f"Linked new database file {database_file_instance.id} to task {task.id}")
        else:
            dbtool_logger.error("Failed to get database file instance for new database")
    elif has_selected_database and not task.database_file:
        # For first group with selected database, link the new file (which was copied from selected)
        if database_file_instance:
            task.database_file = database_file_instance
            task.save(update_fields=['database_file'])
            dbtool_logger.info(f"Linked database file {database_file_instance.id} to task {task.id} (copied from selected database)")
        else:
            dbtool_logger.error("Failed to get database file instance for selected database copy")
    elif task.database_file:
        # For subsequent groups, we're modifying the existing task database file
        if database_file_instance:
            dbtool_logger.info(f"Updated existing database file {task.database_file.id} with new content")
            # Note: The existing file reference remains the same, but content is updated
        else:
            dbtool_logger.warning("Failed to get database file instance for existing database update")
    else:
        # This case shouldn't happen, but log it
        dbtool_logger.warning(f"Unexpected database file state: has_selected_database={has_selected_database}, task.database_file={task.database_file is not None}")
    
    # Calculate processing statistics
    processing_time = (end_time - start_time).total_seconds()
    
    # Try to extract some basic statistics from the database
    total_samples = extract_sample_count_from_output(result.stdout, result.stderr, group)
    processed_files = len(group.audio_file_ids)
    
    # Update the task's database metadata if we have a new file
    if database_file_instance:
        update_database_file_metadata(task.id, database_file_instance.meta or {})
    else:
        dbtool_logger.error("Failed to upload database file to storage")
        # Even if upload fails, we should still return a result with error status
        processing_result = {
            'task_id': task.id,
            'group_id': group.id,
            'status': 'failed',
            'local_path': local_path,
            'output_path': output_path,
            'database_file_id': None,
            'processed_files': processed_files,
            'total_samples': total_samples,
            'processing_time': processing_time,
            'file_size': file_size,
            'command_successful': True,
            'upload_successful': False,
            'error': 'Failed to upload database file to storage'
        }
        
        file_utils.write_to_console(console_output_file, [
            "Database processing completed but upload failed:",
            f"Local database: {output_path}",
            f"File size: {file_size} bytes",
            f"Processing time: {processing_time:.2f} seconds",
            f"Processed files: {processed_files}",
            f"Total samples: {total_samples}",
            "ERROR: Failed to upload database to storage",
            "\n"
        ])
        
        return processing_result
    
    processing_result = {
        'task_id': task.id,
        'group_id': group.id,
        'status': 'completed',
        'local_path': local_path,
        'output_path': output_path,
        'database_file_id': database_file_instance.id if database_file_instance else None,
        'processed_files': processed_files,
        'total_samples': total_samples,
        'processing_time': processing_time,
        'file_size': file_size,
        'command_successful': True,
        'upload_successful': True,
    }
    
    file_utils.write_to_console(console_output_file, [
        "Database processing completed successfully:",
        f"Output database: {database_filename}",
        f"File size: {file_size} bytes",
        f"Processing time: {processing_time:.2f} seconds",
        f"Processed files: {processed_files}",
        f"Total samples: {total_samples}",
        "\n"
    ])
    
    return processing_result


def construct_ketos_create_db_command(task_context: Dict[str, Any], output_path: str) -> list:
    """
    Construct the ketos-create-db command based on task configuration.
    
    Working Directory Strategy:
    - Command will be executed from the task root directory (e.g., /tasks/database/21/)
    - All paths in the command are relative to the task root
    - This allows ketos-create-db to properly resolve CSV filename paths relative to the audio directory
    
    Args:
        task_context: Dictionary containing task context
        output_path: Path where the output database should be saved
        
    Returns:
        List containing the command and arguments
    """
    task = task_context["task"]
    group = task_context["group"]
    
    # Base command
    command = ['ketos-create-db']
    
    # Add audio directory (relative to task root)
    audio_dir = task_context.get("audio_dir")
    if not audio_dir:
        raise Exception("Audio directory not found in task context. This usually means the audio files download failed or the group has no audio files configured.")
    
    # Get the relative path from task root to audio directory
    task_root = task_context["local_path"]
    audio_dir_rel = os.path.relpath(audio_dir, task_root)
    command.append(audio_dir_rel)
    
    # Add audio representation config file (relative to task root)
    config_dir = task_context.get("config_dir")
    if not config_dir:
        raise Exception("Config directory not found in task context. This usually means the audio representation config file download failed or the group has no config file configured.")
    
    # Find the config file in the config directory
    config_files = os.listdir(config_dir)
    if not config_files:
        raise Exception(f"No config files found in config directory: {config_dir}")
    
    config_file_path = os.path.join(config_dir, config_files[0])
    config_file_rel = os.path.relpath(config_file_path, task_root)
    command.append(config_file_rel)
    
    # Check if we have annotations or should use random selections
    config = group.config
    dbtool_logger.info(f"Group config: {config}")
    
    annotations_file_id = config.get('annotations', {}).get('file_id')
    
    if annotations_file_id:
        # We have annotations - use the downloaded file from annotation directory
        annotation_dir = task_context.get("annotation_dir")
        if not annotation_dir:
            raise Exception("Annotation directory not found in task context. This usually means the annotation file download failed.")
        
        # Get the annotation file path relative to task root
        # The annotation file is in the annotation directory, so we need to include the filename
        annotation_file_name = os.listdir(annotation_dir)[0]  # Get the first (and only) file
        annotation_file_rel = os.path.join(os.path.relpath(annotation_dir, task_root), annotation_file_name)
        command.extend(['--annotations', annotation_file_rel])
        
        # Add labels if specified
        labels = config.get('annotations', {}).get('labels', {})
        if labels:
            # Pass each label separately to avoid parsing issues
            for k, v in labels.items():
                command.extend(['--labels', f"{k}={v}"])
        
        # Add annotation parameters
        annotation_step = config.get('annotations', {}).get('annotation_step', 0.5)
        step_min_overlap = config.get('annotations', {}).get('step_min_overlap', 0.7)
        only_augmented = config.get('annotations', {}).get('only_augmented', False)
        
        command.extend(['--annotation_step', str(annotation_step)])
        command.extend(['--step_min_overlap', str(step_min_overlap)])
        if only_augmented:
            command.append('--only_augmented')
    
    else:
        # No annotations - use random selections
        random_selections_config = config.get('random_selections', {})
        num_samples = random_selections_config.get('num_samples', 100)
        label = random_selections_config.get('label', 0)
        filename_filter_file_id = random_selections_config.get('filename_filter_file_id')
        
        # Handle "same" value for num_samples (generate same number as largest annotation group)
        if num_samples == "same":
            dbtool_logger.info("num_samples is 'same', will use ketos-create-db default behavior")
            num_samples_arg = "same"
        else:
            num_samples_arg = str(num_samples)
        
        # Log the configuration being used
        dbtool_logger.info(f"Random selections config: {random_selections_config}")
        dbtool_logger.info(f"Using num_samples: {num_samples} (from config: {random_selections_config.get('num_samples')})")
        dbtool_logger.info(f"Using label: {label}")
        if filename_filter_file_id:
            dbtool_logger.info(f"Using filename_filter_file_id: {filename_filter_file_id}")
        
        # Build random_selections arguments separately as ketos-create-db expects
        command.extend(['--random_selections', num_samples_arg, str(label)])
        if filename_filter_file_id:
            # Download the filename filter file and use it
            file_utils = FileUtils()
            filename_filter_path = file_utils.download_file(filename_filter_file_id)
            if filename_filter_path:
                # Make filename filter path relative to task root
                filename_filter_rel = os.path.relpath(filename_filter_path, task_root)
                command.append(filename_filter_rel)
                dbtool_logger.info(f"Added filename filter: {filename_filter_rel}")
            else:
                dbtool_logger.warning(f"Failed to download filename filter file {filename_filter_file_id}")
    
    # Add table name (group name)
    table_name = group.name
    if not table_name.startswith('/'):
        table_name = f"/{table_name}"
    command.extend(['--table_name', table_name])
    
    # Add output path (relative to task root)
    output_rel = os.path.relpath(output_path, task_root)
    command.extend(['--output', output_rel])
    
    # Note: We don't specify --overwrite parameter, using default behavior
    # Default is --overwrite False, which means append to existing database
    # This is exactly what we want: preserve existing data and append new data
    dbtool_logger.info(f"Using default --overwrite False behavior (append to existing database)")
    
    # Log the final command for debugging
    dbtool_logger.info(f"ketos-create-db command: {' '.join(command)}")
    dbtool_logger.info(f"Working directory: {task_root}")
    
    # Log the directory structure for debugging
    if annotations_file_id:
        annotation_dir = task_context.get("annotation_dir")
        if annotation_dir:
            dbtool_logger.info(f"Annotation directory: {annotation_dir}")
            dbtool_logger.info(f"Annotation files: {os.listdir(annotation_dir)}")
    
    # Add seed for reproducibility if specified
    seed = config.get('seed')
    if seed is not None:
        command.extend(['--seed', str(seed)])
    
    return command


def extract_sample_count_from_output(stdout: str, stderr: str, group: DatabaseGroup) -> int:
    """
    Extract the actual number of samples generated from ketos-create-db output.
    
    Args:
        stdout: Standard output from ketos-create-db command
        stderr: Standard error from ketos-create-db command
        group: The database group instance
        
    Returns:
        int: Number of samples generated, or 0 if cannot determine
    """
    try:
        # Combine stdout and stderr for analysis
        output = (stdout or "") + (stderr or "")
        
        # Look for progress indicators like "100%|██████████| 1000/1000 [10:40<00:00,  1.75it/s]"
        import re
        
        # Pattern to match progress bars: "100%|██████████| 1000/1000 [time<remaining, rate]"
        progress_pattern = r'100%\s*\|\s*[█\s]*\|\s*(\d+)/(\d+)\s*\[.*?\]'
        progress_matches = re.findall(progress_pattern, output)
        
        if progress_matches:
            # Take the last progress bar (most recent/final)
            last_match = progress_matches[-1]
            total_samples = int(last_match[1])  # The total number (second number in X/Y)
            dbtool_logger.info(f"Extracted sample count from progress bar: {total_samples}")
            return total_samples
        
        # Look for other indicators in the output
        # Pattern for "Processed X samples" or similar
        samples_pattern = r'(\d+)\s*samples?'
        samples_matches = re.findall(samples_pattern, output, re.IGNORECASE)
        
        if samples_matches:
            total_samples = int(samples_matches[-1])  # Take the last match
            dbtool_logger.info(f"Extracted sample count from text: {total_samples}")
            return total_samples
        
        # Look for "Generated X segments" or similar
        segments_pattern = r'(\d+)\s*segments?'
        segments_matches = re.findall(segments_pattern, output, re.IGNORECASE)
        
        if segments_matches:
            total_samples = int(segments_matches[-1])  # Take the last match
            dbtool_logger.info(f"Extracted sample count from segments: {total_samples}")
            return total_samples
        
        # If we can't find specific output, try to infer from group configuration
        if group.config.get('random_selections'):
            random_config = group.config['random_selections']
            num_samples = random_config.get('num_samples')
            
            if num_samples and num_samples != "same":
                dbtool_logger.info(f"Inferred sample count from group config: {num_samples}")
                return int(num_samples)
            elif num_samples == "same":
                dbtool_logger.info("num_samples is 'same', cannot determine exact count from config")
                return 0
        
        # If we still can't determine, log what we found
        dbtool_logger.warning(f"Could not extract sample count from output. Output length: {len(output)}")
        if output:
            dbtool_logger.debug(f"Output content: {output[:500]}...")  # Log first 500 chars
        
        return 0
        
    except Exception as e:
        dbtool_logger.error(f"Error extracting sample count from output: {e}")
        return 0


def update_database_metadata(task_id: int) -> bool:
    """
    Sync task metadata with the actual database file metadata.
    
    Args:
        task_id: ID of the database task
        
    Returns:
        bool: True if sync was successful, False otherwise
    """
    try:
        with transaction.atomic():
            task = DatabaseTask.objects.select_for_update().get(id=task_id)
            
            # Check if database file exists
            if not task.database_file:
                dbtool_logger.warning(f"No database file found for task {task_id}")
                return False
            
            # Sync metadata from database file
            if task.database_file.meta:
                task.database_metadata = task.database_file.meta
                task.save(update_fields=['database_metadata'])
                dbtool_logger.info(f"Synced database metadata for task {task_id}")
                return True
            else:
                dbtool_logger.warning(f"No metadata found in database file for task {task_id}")
                return False
            
    except DatabaseTask.DoesNotExist:
        dbtool_logger.error(f"Database task {task_id} not found for metadata sync")
        return False
    except Exception as e:
        dbtool_logger.error(f"Error syncing database metadata for task {task_id}: {e}")
        return False


def update_database_file_metadata(task_id: int, database_metadata: Dict[str, Any]) -> bool:
    """
    Update the metadata of the actual database file after processing is complete.
    This function should be called from the actual database processing logic.
    
    Args:
        task_id: ID of the database task
        database_metadata: Complete HDF5 database metadata
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    try:
        with transaction.atomic():
            task = DatabaseTask.objects.select_for_update().get(id=task_id)
            
            # Check if database file exists
            if not task.database_file:
                dbtool_logger.error(f"No database file found for task {task_id}")
                return False
            
            # Update database file metadata
            task.database_file.meta = database_metadata
            task.database_file.save(update_fields=['meta'])
            
            # Sync task metadata with database file metadata
            task.database_metadata = database_metadata
            task.save(update_fields=['database_metadata'])
            
            dbtool_logger.info(f"Updated database file metadata for task {task_id}")
            return True
            
    except DatabaseTask.DoesNotExist:
        dbtool_logger.error(f"Database task {task_id} not found for metadata update")
        return False
    except Exception as e:
        dbtool_logger.error(f"Error updating database file metadata for task {task_id}: {e}")
        return False


def update_group_statistics(group_id: int, processing_result: Dict[str, Any]) -> bool:
    """
    Update the statistics for a specific group after processing.
    
    Args:
        group_id: ID of the database group
        processing_result: Dictionary containing processing results
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    try:
        with transaction.atomic():
            group = DatabaseGroup.objects.select_for_update().get(id=group_id)
            
            # Update group statistics with processing results
            group.statistics.update(processing_result)
            
            # Add metadata specific to HDF5 structure
            if 'datasets' not in group.statistics:
                group.statistics['datasets'] = {
                    'audio': 'float32',
                    'labels': 'int32',
                    'metadata': 'object'
                }
            
            # Add processing metadata
            group.statistics.update({
                'processed_at': timezone.now().isoformat(),
                'processing_successful': True,
                'total_samples': processing_result.get('total_samples', 0),
                'processed_files': processing_result.get('processed_files', 0),
            })
            
            group.save(update_fields=['statistics'])
            
            dbtool_logger.info(f"Updated metadata for group {group_id}")
            return True
            
    except DatabaseGroup.DoesNotExist:
        dbtool_logger.error(f"Database group {group_id} not found for metadata update")
        return False
    except Exception as e:
        dbtool_logger.error(f"Error updating metadata for group {group_id}: {e}")
        return False


def cancel_database_processing(task_id: int, group_id: int) -> bool:
    """
    Cancel ongoing database processing for a group.
    
    Args:
        task_id: ID of the database task
        group_id: ID of the database group
        
    Returns:
        bool: True if cancellation was successful, False otherwise
    """
    try:
        with transaction.atomic():
            group = DatabaseGroup.objects.select_for_update().get(id=group_id)
            
            # Cancel celery task if it exists
            if group.celery_task_id:
                from celery.result import AsyncResult
                celery_result = AsyncResult(group.celery_task_id)
                if celery_result.state in ['PENDING', 'STARTED']:
                    celery_result.revoke(terminate=True)
                    dbtool_logger.info(f"Cancelled celery task {group.celery_task_id}")
            
            # Update status to cancelled
            group.status = 'failed'
            group.celery_task_id = None
            group.save(update_fields=['status', 'celery_task_id'])
            
            dbtool_logger.info(f"Cancelled processing for group {group_id}")
            return True
            
    except DatabaseGroup.DoesNotExist:
        dbtool_logger.error(f"Database group {group_id} not found")
        return False
    except Exception as e:
        dbtool_logger.error(f"Error cancelling processing for group {group_id}: {e}")
        return False


def cleanup_cached_file(file_id: int, reason: str = "unknown") -> bool:
    """
    Clean up a cached file from the NFS server.
    
    Args:
        file_id: The ID of the file to clean up from cache
        reason: Reason for cleanup (for logging purposes)
        
    Returns:
        bool: True if cleanup was successful, False otherwise
    """
    try:
        shared_file_cache.delete(file_id)
        dbtool_logger.info(f"Successfully cleaned up cached file {file_id} from NFS server (reason: {reason})")
        return True
    except Exception as e:
        dbtool_logger.warning(f"Failed to clean up cached file {file_id} from NFS server (reason: {reason}): {e}")
        return False


def upload_database_to_storage(local_path: str, filename: str, task: DatabaseTask, group: DatabaseGroup, file_utils: FileUtils, console_output_file: str = None) -> Optional[File]:
    """
    Upload the generated database to minio storage.
    
    Metadata Strategy:
    - H5 metadata is extracted directly from the file using extract_h5_metadata_from_file
    - Task context information is available through database relationships (task.database_file, group.task, etc.)
    - This approach avoids data duplication and maintains data integrity
    
    Args:
        local_path: Local path to the database file
        filename: Name of the database file
        task: The database task instance
        group: The database group instance
        file_utils: FileUtils instance for file operations
        console_output_file: Optional console output file for logging
        
    Returns:
        File instance if successful, None otherwise
    """
    try:
        
        # Check if we already have a database file for this task
        if task.database_file:
            # We're updating an existing database
            existing_file = task.database_file
            existing_path = existing_file.path
            dbtool_logger.info(f"Updating existing database file at path: {existing_path}")
            
            # Log cache status before update
            cached_path = shared_file_cache.get(existing_file.id)
            if cached_path:
                dbtool_logger.info(f"Found cached file {existing_file.id} at: {cached_path}")
            else:
                dbtool_logger.info(f"No cached file found for {existing_file.id}")
            
            # Add console output to show we're updating
            if console_output_file:
                file_utils.write_to_console(console_output_file, [
                    f"Updating existing database file:",
                    f"Path: {existing_path}",
                    f"File ID: {existing_file.id}",
                    "\n"
                ])
            
            # Instead of creating a new File record, we need to update the existing one
            # First, let's check if the file exists in storage and update it there
            try:
                # IMPORTANT: Clean up the cached version from NFS server BEFORE updating
                # This ensures the handle_h5_file_meta_post_save function downloads the fresh file
                try:
                    cleanup_cached_file(existing_file.id, "pre_update")
                except Exception as cache_error:
                    dbtool_logger.warning(f"Failed to clean up cached file {existing_file.id} from NFS server before update: {cache_error}")
                    # Continue with the update even if cache cleanup fails
                
                # Read the new file content
                with open(local_path, 'rb') as new_file:
                    # Update the existing file's content in storage
                    existing_file.file.save(existing_file.basename, new_file, save=False)
                    
                                    # Extract H5 metadata directly from the local file using shared module
                h5_metadata = extract_h5_metadata_from_file(local_path)
                
                # Update metadata with H5 information
                if h5_metadata:
                    existing_file.meta = h5_metadata
                    dbtool_logger.info(f"Updated file metadata with H5 information: {list(h5_metadata.keys())}")
                else:
                    existing_file.meta = {}
                    dbtool_logger.warning(f"Failed to extract H5 metadata from local file: {local_path}")
                
                # Update timestamp
                existing_file.updated_at = timezone.now()
                
                # Recalculate SHA256 for the new content
                sha256_hash = hashlib.sha256()
                existing_file.file.seek(0)
                for byte_block in iter(lambda: existing_file.file.read(4096), b""):
                    sha256_hash.update(byte_block)
                existing_file.sha256 = sha256_hash.hexdigest()
                
                # Save the updated file instance with all changes
                # No need to trigger H5 metadata extraction signal since we did it directly
                existing_file.save(update_fields=['file', 'meta', 'updated_at', 'sha256'])
                
                dbtool_logger.info(f"Updated file {existing_file.id} with direct H5 metadata extraction - no signal needed")
                
                dbtool_logger.info(f"Successfully updated existing database file {existing_path} in storage")
                return existing_file
                    
            except Exception as e:
                dbtool_logger.error(f"Failed to update existing database file {existing_path}: {e}")
                # Fallback: try to upload as a new file with a modified path
                fallback_path = f"{existing_path}_updated_{int(time.time())}"
                dbtool_logger.info(f"Trying fallback upload with path: {fallback_path}")
                
                # Clean up the cached version of the old file before fallback upload
                try:
                    cleanup_cached_file(existing_file.id, "pre_fallback_upload")
                except Exception as cache_error:
                    dbtool_logger.warning(f"Failed to clean up cached file {existing_file.id} from NFS server before fallback upload: {cache_error}")
                
                # Use file_utils to upload with modified path
                file_instance = file_utils.upload_file(
                    local_file_path=local_path,
                    maipl_folder='.h5 databases',
                    path=fallback_path,
                    meta={},  # Empty metadata, will be updated with H5 metadata below
                    user=task.user
                )
                
                if file_instance:
                    # Extract H5 metadata directly from the local file and update the file instance
                    h5_metadata = extract_h5_metadata_from_file(local_path)
                    if h5_metadata:
                        file_instance.meta = h5_metadata
                        file_instance.save(update_fields=['meta'])
                        dbtool_logger.info(f"Updated fallback file metadata with H5 information: {list(h5_metadata.keys())}")
                    else:
                        dbtool_logger.warning(f"Failed to extract H5 metadata from fallback file: {local_path}")
                    
                    dbtool_logger.info(f"Fallback upload successful with path: {fallback_path}")
                    return file_instance
                else:
                    dbtool_logger.error(f"Fallback upload also failed")
                    return None
        else:
            # This is a new database, create structured path to avoid conflicts
            # Structure: user_{user_id}/task_{task_id}/{filename}
            structured_path = f"user_{task.user.id}/task_{task.id}/{filename}"
            dbtool_logger.info(f"Creating new database with structured path: {structured_path}")
            
            # Add console output to show storage path
            if console_output_file:
                file_utils.write_to_console(console_output_file, [
                    f"New database will be stored at:",
                    f"Folder: .h5 databases",
                    f"Path: {structured_path}",
                    "\n"
                ])
            
            # Upload with structured path
            file_instance = file_utils.upload_file(
                local_file_path=local_path,
                maipl_folder='.h5 databases',
                path=structured_path,
                meta={},  # Empty metadata, will be updated with H5 metadata below
                user=task.user
            )
            
            if file_instance:
                # Extract H5 metadata directly from the local file and update the file instance
                h5_metadata = extract_h5_metadata_from_file(local_path)
                if h5_metadata:
                    file_instance.meta = h5_metadata
                    file_instance.save(update_fields=['meta'])
                    dbtool_logger.info(f"Updated new file metadata with H5 information: {list(h5_metadata.keys())}")
                else:
                    dbtool_logger.warning(f"Failed to extract H5 metadata from new file: {local_path}")
                
                dbtool_logger.info(f"Successfully uploaded new database {filename} to storage with ID {file_instance.id}")
                return file_instance
            else:
                dbtool_logger.error(f"Failed to upload new database {filename} to storage")
                return None
            
    except Exception as e:
        dbtool_logger.error(f"Error uploading database {filename} to storage: {e}")
        return None
