#!/bin/bash
# Production environment configuration

# Set environment-specific variables
DEBUG=0
IS_DEMO_ENVIRONMENT=false
DJANGO_ALLOWED_HOSTS=localhost,api.maipl.com
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost,https://api.maipl.com,https://maipl.com,https://www.maipl.com
CORS_ALLOWED_ORIGINS=https://maipl.com,https://www.maipl.com
ALLOWED_REDIRECT_URLS=maipl.com,www.maipl.com

# Database settings
POSTGRES_DB=maipl-backend-prod
POSTGRES_HOST=maipl-database-prod-1
POSTGRES_PORT=5432

# Minio settings
MINIO_ENDPOINT=maipl-minio-prod-1:9000
MINIO_EXTERNAL_ENDPOINT=minio.maipl.com
MINIO_BUCKET_NAME=maipl-prod

# File cache
FILE_CACHE_LOCATION=/mnt/file_cache
TASKS_LOCAL_STORAGE=/mnt/tasks

# Celery broker settings
CELERY_BROKER_URL_PROTOCOL=amqp
CELERY_BROKER_URL_USER=rabbitmq
CELERY_BROKER_URL_PASSWORD=rabbitmq
CELERY_BROKER_URL_HOST=rabbit
CELERY_BROKER_URL_PORT=5672 