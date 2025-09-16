#!/bin/bash

# Script to generate .env file from multiple sources
# Usage: ./generate_env.sh [environment]
# Where environment is one of: staging, demo, prod

# Default to staging if no environment specified
ENV=${1:-staging}
OUTPUT_FILE="backend/.env"

# Validate environment
if [[ ! "$ENV" =~ ^(staging|demo|prod)$ ]]; then
    echo "Error: Environment must be one of: staging, demo, prod"
    echo "Usage: ./generate_env.sh [environment]"
    exit 1
fi

echo "Generating .env file for $ENV environment..."

# Start with the template
cp "backend/config/.env.template" "$OUTPUT_FILE"

# Replace template placeholders
sed -i "s/__DJANGO_ENV__/$ENV/g" "$OUTPUT_FILE"

# Load environment-specific variables if available
if [ -f "backend/config/env.$ENV.sh" ]; then
    source "backend/config/env.$ENV.sh"
fi

# Add non-sensitive variables
cat >> "$OUTPUT_FILE" << EOL
# Django settings
DJANGO_PORT=${DJANGO_PORT:-8000}
DEBUG=${DEBUG:-0}
DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS:-localhost}
DJANGO_CSRF_TRUSTED_ORIGINS=${DJANGO_CSRF_TRUSTED_ORIGINS:-http://localhost}

# Cors settings
CORS_ALLOW_ALL_ORIGINS=${CORS_ALLOW_ALL_ORIGINS:-false}
CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-http://localhost:3000}

# Database connection
POSTGRES_DB=${POSTGRES_DB:-maipl-$ENV}
POSTGRES_HOST=${POSTGRES_HOST:-maipl-database-$ENV-1}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

# Minio settings
MINIO_ENDPOINT=${MINIO_ENDPOINT:-maipl-minio-$ENV-1:9000}
MINIO_EXTERNAL_ENDPOINT=${MINIO_EXTERNAL_ENDPOINT:-minio.maipl-$ENV.com}
MINIO_BUCKET_NAME=${MINIO_BUCKET_NAME:-maipl-$ENV}

# Redis settings
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_DB=${REDIS_DB:-0}

# File cache
FILE_CACHE_LOCATION=${FILE_CACHE_LOCATION:-/mnt/file_cache}

# Other configuration
ALLOWED_REDIRECT_URLS=${ALLOWED_REDIRECT_URLS:-localhost:3000}
EOL

# Load environment-specific secrets if available
if [ -f "backend/config/secrets.$ENV.sh" ]; then
    source "backend/config/secrets.$ENV.sh"
fi

# Add sensitive variables
cat >> "$OUTPUT_FILE" << EOL
# Sensitive information
DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY:-django-insecure-keys}
POSTGRES_USER=${POSTGRES_USER:-maipl123}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-maipl123}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-accesskey}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-secretkey}
REDIS_PASSWORD=${REDIS_PASSWORD:-redis123}

# Email settings
EMAIL_HOST=${EMAIL_HOST:-mail.example.com}
EMAIL_PORT=${EMAIL_PORT:-465}
EMAIL_HOST_USER=${EMAIL_HOST_USER:-admin@example.com}
EMAIL_HOST_PASSWORD=${EMAIL_HOST_PASSWORD:-password}
EMAIL_USE_TLS=${EMAIL_USE_TLS:-False}
EMAIL_USE_SSL=${EMAIL_USE_SSL:-True}
DEFAULT_FROM_EMAIL=${DEFAULT_FROM_EMAIL:-admin@example.com}

# Admin user
ADMIN_FIRST_NAME=${ADMIN_FIRST_NAME:-Admin}
ADMIN_LAST_NAME=${ADMIN_LAST_NAME:-User}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-adminpassword}
EOL

echo "Environment file generated at $OUTPUT_FILE for $ENV environment" 