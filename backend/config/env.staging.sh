#!/bin/bash
# Staging environment configuration

# Set environment-specific variables
DEBUG=1
IS_DEMO_ENVIRONMENT=false
DJANGO_ALLOWED_HOSTS=localhost,dev-backend.maipl-dev.com
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost,https://dev-backend.maipl-dev.com,https://dev.maipl-dev.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3100,https://dev.maipl-dev.com
ALLOWED_REDIRECT_URLS=localhost:3000,dev.maipl-dev.com

# Database settings
POSTGRES_DB=maipl-backend-staging
POSTGRES_HOST=maipl-database-staging-1
POSTGRES_PORT=5432

# Minio settings
MINIO_ENDPOINT=maipl-minio-staging-1:9000
MINIO_EXTERNAL_ENDPOINT=minio.maipl-dev.com
MINIO_BUCKET_NAME=maipl-staging

# File cache
FILE_CACHE_LOCATION=/mnt/file_cache
TASKS_LOCAL_STORAGE=/mnt/tasks

# Celery broker settings
CELERY_BROKER_URL_PROTOCOL=amqp
CELERY_BROKER_URL_USER=rabbitmq
CELERY_BROKER_URL_PASSWORD=rabbitmq
CELERY_BROKER_URL_HOST=rabbit
CELERY_BROKER_URL_PORT=5672 