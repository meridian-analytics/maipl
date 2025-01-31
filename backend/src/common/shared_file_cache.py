import os
import hashlib
from django.conf import settings
import redis

class SharedFileCache:
    def __init__(self, cache_dir='/cache'):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        self.redis = redis.Redis.from_url(settings.REDIS_URL)

    def _get_file_path(self, file_id):
        # Generate a unique file path for each file ID using MD5 hashing
        hash_key = hashlib.md5(str(file_id).encode()).hexdigest()
        return os.path.join(self.cache_dir, hash_key)

    def _get_redis_key(self, file_id):
        # Generate a unique Redis key for each file ID
        return f"file_cache:{file_id}"

    def get(self, file_id):
        # Get the path where the file would be stored in the cache
        file_path = self._get_file_path(file_id)
        # Check if the file exists in the cache
        if os.path.exists(file_path):
            # If the file is in the cache, increment its access count in Redis
            self.redis.zincrby('file_cache:access', 1, self._get_redis_key(file_id))
            return file_path
        # If the file is not in the cache, return None
        return None

    def set(self, file_id):
        # Add the file to the Redis database with an initial access count of 0
        redis_key = self._get_redis_key(file_id)
        self.redis.zadd('file_cache:access', {redis_key: 0})

    def delete(self, file_id):
        file_path = self._get_file_path(file_id)
        if os.path.exists(file_path):
            os.remove(file_path)
        self.redis.zrem('file_cache:access', self._get_redis_key(file_id))

# Initialize the shared file cache
shared_file_cache = SharedFileCache()