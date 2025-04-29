import os
import hashlib
import redis
from .shared_file_cache import shared_file_cache
from file.models import File
from common.logger import file_logger
from django.conf import settings
from typing import Optional, List, Union
from django.core.files import File as DjangoFile
from user.models import User

TASK_LOCAL_STORAGE = settings.TASKS_LOCAL_STORAGE
FILE_CACHE_DIR = settings.FILE_CACHE_DIR

class FileUtils:
    def __init__(self):
        self.redis_client = redis.Redis.from_url(settings.REDIS_URL)
        self.logger = file_logger
        self.file_download_lock_timeout = 300  # 5 minutes
        self.file_download_blocking_timeout = 60  # 1 minute

    def download_file(self, file_id: int) -> Optional[str]:
        """
        Downloads a file and caches it using SharedFileCache.
        
        Args:
            file_id: The ID of the file to download
            
        Returns:
            str: Path to the cached file if successful, None otherwise
        """
        file_instance = File.objects.get(id=file_id)
        basename = file_instance.basename
        self.logger.info(f"Attempting to download file: {basename}")

        # Check if the file path has already been cached
        cached_file_path = shared_file_cache.get(file_id)
        if cached_file_path and os.path.exists(cached_file_path):
            self.logger.info(f"File found in cache: {cached_file_path}")
            return cached_file_path

        lock_key = f"file_download_lock:{file_id}"
        lock = self.redis_client.lock(
            lock_key,
            timeout=self.file_download_lock_timeout,
            blocking_timeout=self.file_download_blocking_timeout
        )
        try:
            have_lock = lock.acquire()
            if not have_lock:
                self.logger.warning(f"Could not acquire lock for file {basename} after {self.file_download_blocking_timeout} seconds, checking if another process downloaded it")
                # Check one more time if another process downloaded it while we were waiting
                cached_file_path = shared_file_cache.get(file_id)
                if cached_file_path and os.path.exists(cached_file_path):
                    self.logger.info(f"File found in cache after waiting: {cached_file_path}")
                    return cached_file_path
                self.logger.error(f"Could not acquire lock and file not in cache for file {basename}")
                return None

            # Double check after acquiring lock
            cached_file_path = shared_file_cache.get(file_id)
            if cached_file_path and os.path.exists(cached_file_path):
                self.logger.info(f"File found in cache after acquiring lock: {cached_file_path}")
                return cached_file_path
            
            try:

                # Get the path where the file should be saved in the cache
                cache_file_path = shared_file_cache._get_file_path(file_id)

                # Download the file in chunks and save it directly to the cache path
                self.logger.info(f"Starting download of file {basename} to {cache_file_path}")
                with open(cache_file_path, 'wb') as cache_file:
                    for chunk in file_instance.file:
                        cache_file.write(chunk)

                # Add the file to the shared cache      
                shared_file_cache.set(file_id)
                self.logger.info(f"File downloaded and cached: {cache_file_path}")
                return cache_file_path

            except File.DoesNotExist:
                self.logger.error(f"No file found with id: {basename}")
                return None
            
        except redis.exceptions.LockError as e:
            self.logger.error(f"Failed to acquire lock for file {basename}: {e}")
            return None
        except Exception as e:
            self.logger.error(f"An error occurred while downloading file {basename}: {e}")
            return None
        finally:
            if 'lock' in locals() and have_lock:
                lock.release()

    def upload_file(self, local_file_path: str, maipl_folder: str, path: str, meta: dict, user: User) -> Optional[File]:
        """
        Uploads a file to the storage and returns its File instance.
        
        Args:
            local_file_path: The path to the local file to upload
            maipl_folder: The folder in which to store the file
            path: The path for the file in storage
            meta: Metadata associated with the file
            user: The ID of the user uploading the file
            
        Returns:
            File: The File instance if successful, None otherwise
        """
        if not os.path.exists(local_file_path):
            self.logger.error(f"Local file does not exist: {local_file_path}")
            return None

        try:
            # Read file and calculate SHA256
            sha256_hash = hashlib.sha256()
            with open(local_file_path, 'rb') as file:
                for byte_block in iter(lambda: file.read(4096), b""):
                    sha256_hash.update(byte_block)
            file_sha256 = sha256_hash.hexdigest()

            # Create a Django file object using the local file path
            with open(local_file_path, 'rb') as file:
                django_file = DjangoFile(file)

                # Create a new File instance
                file_instance = File(
                    file=django_file,
                    maipl_folder=maipl_folder,
                    path=path,
                    sha256=file_sha256,
                    meta=meta,
                    user_id=user
                )

                # Save the file instance
                file_instance.save()

            self.logger.info(f"File uploaded successfully: {file_instance.basename}")
            return file_instance

        except Exception as e:
            self.logger.error(f"Failed to upload file: {e}")
            return None

    def create_local_path(self, task, task_type: str) -> Optional[str]:
        """
        Creates a local path for task files and updates the task instance.
        
        Args:
            task: The task instance
            task_type: The type of task
            
        Returns:
            str: The created local path if successful, None otherwise
        """
        local_path = os.path.join(TASK_LOCAL_STORAGE, task_type, str(task.id))
        try:
            os.makedirs(local_path, exist_ok=True)
            task.local_path = local_path
            task.save()
            self.logger.info(f"Local path: {local_path} created")
            return local_path
        except PermissionError:
            self.logger.error(f"Permission denied when creating directory: {local_path}")
            return None
        except Exception as e:
            self.logger.error(f"Error creating directory: {e}")
            return None

    def create_console_output_file(self, task) -> Optional[str]:
        """
        Creates a console output file for the task.
        
        Args:
            task: The task instance
            
        Returns:
            str: Path to the console output file if successful, None otherwise
        """
        if not task.local_path:
            self.logger.error("Task has no local path set")
            return None
            
        file_path = os.path.join(task.local_path, "console.txt")
        try:
            with open(file_path, "w") as f:
                f.write("Task started.......\n")
            return file_path
        except Exception as e:
            self.logger.error(f"Failed to create console output file: {e}")
            return None

    def write_to_console(self, console_file: str, lines: Union[str, List[str]]) -> bool:
        """
        Writes lines to the console output file.
        
        Args:
            console_file: Path to the console output file
            lines: Single line or list of lines to write
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not os.path.exists(console_file):
            self.logger.error(f"Console file does not exist: {console_file}")
            return False
            
        try:
            with open(console_file, "a") as f:
                if isinstance(lines, str):
                    f.write(f"{lines}\n")
                else:
                    for line in lines:
                        f.write(f"{line}\n")
            return True
        except Exception as e:
            self.logger.error(f"Failed to write to console file: {e}")
            return False

# Create a singleton instance
_file_utils = FileUtils()

def download_file(file_id: int) -> Optional[str]:
    return _file_utils.download_file(file_id)

def upload_file(local_file_path: str, maipl_folder: str, path: str, meta: dict, user: int) -> Optional[int]:
    return _file_utils.upload_file(local_file_path, maipl_folder, path, meta, user)

def create_local_path(task, task_type: str) -> str:
    return _file_utils.create_local_path(task, task_type)

def create_console_output_file(task) -> str:
    return _file_utils.create_console_output_file(task)

def write_to_console(console_file, lines):
    return _file_utils.write_to_console(console_file, lines)