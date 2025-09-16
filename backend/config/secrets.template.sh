#!/bin/bash
# Template for environment secrets
# Copy this file to secrets.<environment>.sh and fill in the values
# DO NOT commit the filled-in files to version control!

# Django
export DJANGO_SECRET_KEY="your-secret-key-here"

# Database
export POSTGRES_USER="database-user"
export POSTGRES_PASSWORD="database-password"

# Minio
export MINIO_ACCESS_KEY="minio-access-key"
export MINIO_SECRET_KEY="minio-secret-key"

# Redis
export REDIS_PASSWORD="redis-password"

# Email
export EMAIL_HOST="mail.example.com"
export EMAIL_PORT="465"
export EMAIL_HOST_USER="admin@example.com"
export EMAIL_HOST_PASSWORD="email-password"
export DEFAULT_FROM_EMAIL="admin@example.com"

# Admin user
export ADMIN_FIRST_NAME="Admin"
export ADMIN_LAST_NAME="User"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="admin-password" 