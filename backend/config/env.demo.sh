#!/bin/bash
# Demo environment configuration

# Set environment-specific variables
DEBUG=1
IS_DEMO_ENVIRONMENT=true
DJANGO_ALLOWED_HOSTS=localhost,demo-backend.maipl-dev.com
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost,https://demo-backend.maipl-dev.com,https://demo.maipl-dev.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3100,https://demo.maipl-dev.com
ALLOWED_REDIRECT_URLS=localhost:3000,demo.maipl-dev.com

# Database settings
POSTGRES_DB=maipl-backend-demo
POSTGRES_HOST=maipl-database-demo-1
POSTGRES_PORT=5432

# Minio settings
MINIO_ENDPOINT=maipl-minio-demo-1:9000
MINIO_EXTERNAL_ENDPOINT=minio.maipl-demo.com
MINIO_BUCKET_NAME=maipl-demo

# File cache
FILE_CACHE_LOCATION=/mnt/file_cache
TASKS_LOCAL_STORAGE=/mnt/tasks

# Celery broker settings
CELERY_BROKER_URL_PROTOCOL=amqp
CELERY_BROKER_URL_USER=rabbitmq
CELERY_BROKER_URL_PASSWORD=rabbitmq
CELERY_BROKER_URL_HOST=rabbit
CELERY_BROKER_URL_PORT=5672 