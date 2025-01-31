
from .shared_file_cache import shared_file_cache
from file.models import File
from .logger import logger
import os
from django.conf import settings
import redis

redis_client = redis.Redis.from_url(settings.REDIS_URL)

def download_file(file_id):
    logger.info(f"Attempting to download file: {file_id}")

    # Check if the file path has already been cached
    cached_file_path = shared_file_cache.get(file_id)

    if cached_file_path and os.path.exists(cached_file_path):
        logger.info(f"File found in cache: {cached_file_path}")
        return cached_file_path

    lock_key = f"file_download_lock:{file_id}"
    with redis_client.lock(lock_key, timeout=60):
        # Check again in case another process downloaded the file while we were waiting for the lock
        cached_file_path = shared_file_cache.get(file_id)
        if cached_file_path and os.path.exists(cached_file_path):
            logger.info(f"File found in cache after acquiring lock: {cached_file_path}")
            return cached_file_path

        try:
            # Fetch file instance from the database
            file_instance = File.objects.get(id=file_id)

            # Get the path where the file should be saved in the cache
            cache_file_path = shared_file_cache._get_file_path(file_id)

            # Download the file in chunks and save it directly to the cache path
            with open(cache_file_path, 'wb') as cache_file:
                for chunk in file_instance.file:
                    cache_file.write(chunk)

            # Add the file to the shared cache
            shared_file_cache.set(file_id)

            logger.info(f"File downloaded and cached: {cache_file_path}")
            return cache_file_path

        except File.DoesNotExist:
            logger.error(f"No file found with id: {file_id}")
            return None
        except Exception as e:
            logger.error(f"An error occurred: {e}")
            return None