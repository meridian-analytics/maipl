import os
import hashlib
import redis
import threading
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
        # Increased timeout to 30 minutes for very large files (e.g., multi-GB audio files)
        # This should handle most cases, but lock renewal is still recommended for extremely large files
        self.file_download_lock_timeout = 1800  # 30 minutes
        self.file_download_blocking_timeout = 60  # 1 minute
        # Renew lock every 10 minutes during download to prevent expiration
        self.file_download_lock_renewal_interval = 600  # 10 minutes

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

                # Start lock renewal thread for long downloads
                stop_renewal = threading.Event()
                renewal_thread = None
                
                def renew_lock_periodically():
                    """Renew the lock periodically to prevent expiration during long downloads"""
                    while not stop_renewal.is_set():
                        # Wait for renewal interval
                        if stop_renewal.wait(self.file_download_lock_renewal_interval):
                            break  # Stop if event is set
                        
                        # Extend the lock if still owned
                        try:
                            if lock.owned():
                                # Extend the lock by the timeout duration
                                lock.extend(self.file_download_lock_timeout)
                                self.logger.debug(f"Extended lock for file {basename} by {self.file_download_lock_timeout} seconds")
                            else:
                                self.logger.warning(f"Lock no longer owned for file {basename}, stopping renewal")
                                break
                        except redis.exceptions.LockError as e:
                            self.logger.warning(f"Failed to extend lock for file {basename}: {e}")
                            break
                        except Exception as e:
                            self.logger.warning(f"Unexpected error extending lock for file {basename}: {e}")
                            break

                # Start renewal thread
                renewal_thread = threading.Thread(target=renew_lock_periodically, daemon=True)
                renewal_thread.start()

                try:
                    # Download the file in chunks and save it directly to the cache path
                    # Use requests with extended timeout to handle large file downloads
                    # Default urllib3 read timeout is ~5 minutes, which is too short for large files
                    try:
                        import requests
                    except ImportError:
                        self.logger.error("requests library not available, falling back to default download method")
                        # Fallback to original method if requests is not available
                        self.logger.info(f"Starting download of file {basename} to {cache_file_path}")
                        with open(cache_file_path, 'wb') as cache_file:
                            for chunk in file_instance.file:
                                cache_file.write(chunk)
                    else:
                        # Get a presigned URL from the storage backend (valid for 1 hour)
                        storage = file_instance.file.storage
                        try:
                            file_url = storage.url(file_instance.file.name)
                        except Exception as e:
                            self.logger.warning(f"Could not get presigned URL for {basename}, falling back to direct download: {e}")
                            # Fallback to original method if URL generation fails
                            self.logger.info(f"Starting download of file {basename} to {cache_file_path}")
                            with open(cache_file_path, 'wb') as cache_file:
                                for chunk in file_instance.file:
                                    cache_file.write(chunk)
                        else:
                            # Download with extended timeouts
                            # timeout: (connect_timeout, read_timeout) tuple
                            # connect: 60 seconds to establish connection
                            # read: 1800 seconds (30 minutes) to read data - handles very large files
                            self.logger.info(f"Starting download of file {basename} to {cache_file_path} using presigned URL")
                            with requests.get(file_url, stream=True, timeout=(60, 1800)) as response:
                                response.raise_for_status()
                                with open(cache_file_path, 'wb') as cache_file:
                                    for chunk in response.iter_content(chunk_size=8192):
                                        if chunk:  # filter out keep-alive chunks
                                            cache_file.write(chunk)

                    # Add the file to the shared cache      
                    shared_file_cache.set(file_id)
                    self.logger.info(f"File downloaded and cached: {cache_file_path}")
                    return cache_file_path
                finally:
                    # Stop lock renewal thread
                    stop_renewal.set()
                    if renewal_thread and renewal_thread.is_alive():
                        renewal_thread.join(timeout=1)

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
                try:
                    # Check if lock is still owned before releasing
                    # Lock may have expired during long downloads
                    if lock.owned():
                        lock.release()
                except redis.exceptions.LockError as e:
                    # Lock may have expired or been released by another process
                    self.logger.warning(f"Could not release lock for file {basename}: {e}")
                except Exception as e:
                    # Catch any other unexpected errors when releasing lock
                    self.logger.warning(f"Unexpected error releasing lock for file {basename}: {e}")

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

    def read_console_output(self, console_file: str) -> Optional[str]:
        """
        Reads the content of a console output file.
        
        Args:
            console_file: Path to the console output file
            
        Returns:
            str: Content of the console output file if successful, None otherwise
        """
        if not os.path.exists(console_file):
            self.logger.error(f"Console file does not exist: {console_file}")
            return None
            
        try:
            with open(console_file, "r") as f:
                content = f.read()
            return content
        except Exception as e:
            self.logger.error(f"Failed to read console file: {e}")
            return None

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

def read_console_output(console_file):
    return _file_utils.read_console_output(console_file)