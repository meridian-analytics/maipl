import os
import hashlib
import redis
from .shared_file_cache import shared_file_cache
from file.models import File
from .logger import logger
from django.conf import settings
from typing import Optional
from django.core.files import File as DjangoFile


TASK_LOCAL_STORAGE = settings.TASKS_LOCAL_STORAGE
FILE_CACHE_DIR = settings.FILE_CACHE_DIR

class FileUtils:
    def __init__(self):
        self.redis_client = redis.Redis.from_url(settings.REDIS_URL)
        self.logger = logger

    def download_file(self, file_id: int) -> Optional[str]:
        """
        Downloads a file and caches it using SharedFileCache.
        
        Args:
            file_id: The ID of the file to download
            
        Returns:
            str: Path to the cached file if successful, None otherwise
        """
        self.logger.info(f"Attempting to download file: {file_id}")

        # Check if the file path has already been cached
        cached_file_path = shared_file_cache.get(file_id)
        if cached_file_path and os.path.exists(cached_file_path):
            self.logger.info(f"File found in cache: {cached_file_path}")
            return cached_file_path

        lock_key = f"file_download_lock:{file_id}"
        with self.redis_client.lock(lock_key, timeout=60):
            # Double-check after acquiring lock
            cached_file_path = shared_file_cache.get(file_id)
            if cached_file_path and os.path.exists(cached_file_path):
                self.logger.info(f"File found in cache after acquiring lock: {cached_file_path}")
                return cached_file_path

            try:
                file_instance = File.objects.get(id=file_id)
                cache_file_path = shared_file_cache._get_file_path(file_id)

                with open(cache_file_path, 'wb') as cache_file:
                    for chunk in file_instance.file:
                        cache_file.write(chunk)

                shared_file_cache.set(file_id)
                self.logger.info(f"File downloaded and cached: {cache_file_path}")
                return cache_file_path

            except File.DoesNotExist:
                self.logger.error(f"No file found with id: {file_id}")
                return None
            except Exception as e:
                self.logger.error(f"An error occurred: {e}")
                return None

    def upload_file(self, local_file_path: str, maipl_folder: str, path: str, meta: dict, user: int) -> Optional[File]:
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
        try:
            # Read file and calculate SHA256
            sha256_hash = hashlib.sha256()
            with open(local_file_path, 'rb') as file:
                for byte_block in iter(lambda: file.read(4096), b""):
                    sha256_hash.update(byte_block)
            file_sha256 = sha256_hash.hexdigest()

            # Create a Django file object using the local file path
            django_file = DjangoFile(open(local_file_path, 'rb'))

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

            self.logger.info(f"File uploaded successfully: {file_instance.id}")
            return file_instance

        except Exception as e:
            self.logger.error(f"Failed to upload file: {e}")
            return None

    def create_local_path(self,task, task_type):
        local_path = os.path.join(TASK_LOCAL_STORAGE, task_type, str(task.id))
        try:
            os.makedirs(local_path, exist_ok=True)
        except PermissionError:
            logger.error(f"Permission denied when creating directory: {local_path}")
        except Exception as e:
            logger.error(f"Error creating directory: {e}")

        task.local_path = local_path
        task.save()
        logger.info(f"Local path: {local_path} created")
        return local_path

    def create_console_output_file(self,task):
        local_path = task.local_path
        file_path = os.path.join(local_path, "console.txt")
        with open(file_path, "w") as f:
            f.write("Task started.......\n")
        return file_path

    def write_to_console(self,console_file, lines):
        with open(console_file, "a") as f:
            for line in lines:
                f.write(f"{line}\n")

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