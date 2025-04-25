from .shared_file_cache import shared_file_cache
from file.models import File
from common.logger import file_logger
import os
from django.conf import settings
import redis
import time

redis_client = redis.Redis.from_url(settings.REDIS_URL)

def download_file(file_id):
    file_logger.info(f"Attempting to download file: {file_id}")

    # Check if the file path has already been cached
    cached_file_path = shared_file_cache.get(file_id)

    if cached_file_path and os.path.exists(cached_file_path):
        file_logger.info(f"File found in cache: {cached_file_path}")
        return cached_file_path

    lock_key = f"file_download_lock:{file_id}"
    lock = redis_client.lock(
        lock_key,
        timeout=300,  # 5 minutes timeout for large files
        blocking_timeout=60  # Wait up to 60 seconds to acquire lock
    )
    
    try:
        have_lock = lock.acquire()
        if not have_lock:
            file_logger.warning(f"Could not acquire lock for file {file_id} after 60 seconds, checking if another process downloaded it")
            # Check one more time if another process downloaded it while we were waiting
            cached_file_path = shared_file_cache.get(file_id)
            if cached_file_path and os.path.exists(cached_file_path):
                file_logger.info(f"File found in cache after waiting: {cached_file_path}")
                return cached_file_path
            file_logger.error(f"Could not acquire lock and file not in cache for file {file_id}")
            return None

        # Double check after acquiring lock
        cached_file_path = shared_file_cache.get(file_id)
        if cached_file_path and os.path.exists(cached_file_path):
            file_logger.info(f"File found in cache after acquiring lock: {cached_file_path}")
            return cached_file_path

        try:
            # Fetch file instance from the database
            file_instance = File.objects.get(id=file_id)

            # Get the path where the file should be saved in the cache
            cache_file_path = shared_file_cache._get_file_path(file_id)

            # Download the file in chunks and save it directly to the cache path
            file_logger.info(f"Starting download of file {file_id} to {cache_file_path}")
            with open(cache_file_path, 'wb') as cache_file:
                for chunk in file_instance.file:
                    cache_file.write(chunk)

            # Add the file to the shared cache
            shared_file_cache.set(file_id)

            file_logger.info(f"File downloaded and cached: {cache_file_path}")
            return cache_file_path

        except File.DoesNotExist:
            file_logger.error(f"No file found with id: {file_id}")
            return None
        except Exception as e:
            file_logger.error(f"An error occurred while downloading file {file_id}: {e}")
            # Clean up any partially downloaded file
            try:
                cache_file_path = shared_file_cache._get_file_path(file_id)
                if os.path.exists(cache_file_path):
                    os.remove(cache_file_path)
            except:
                pass
            return None

    except redis.exceptions.LockError as e:
        file_logger.error(f"Redis lock error for file {file_id}: {e}")
        return None
    finally:
        try:
            # Only release if we got the lock and still own it
            if 'lock' in locals() and have_lock:
                lock.release()
        except redis.exceptions.LockError:
            # If we can't release the lock (already expired), just log it
            file_logger.warning(f"Could not release lock for file {file_id} (may have expired)")