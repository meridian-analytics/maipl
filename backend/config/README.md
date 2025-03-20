# Environment Variable Management

This directory contains configuration files for managing environment variables across different environments (staging, demo, production).

## Structure

- `.env.template` - Base template with placeholders
- `env.staging.sh` - Non-sensitive variables for staging environment
- `env.demo.sh` - Non-sensitive variables for demo environment
- `env.prod.sh` - Non-sensitive variables for production environment
- `secrets.template.sh` - Template for sensitive variables (do not commit actual secrets)

## Local Development

For local development, you can use the provided script to generate an environment file:

```bash
# Generate .env file for staging environment
./scripts/generate_env.sh staging

# Generate .env file for demo environment
./scripts/generate_env.sh demo

# Generate .env file for production environment
./scripts/generate_env.sh prod
```

## Managing Secrets Locally

1. Copy the secrets template to create environment-specific secrets files:

```bash
cp backend/config/secrets.template.sh backend/config/secrets.staging.sh
cp backend/config/secrets.template.sh backend/config/secrets.demo.sh
cp backend/config/secrets.template.sh backend/config/secrets.prod.sh
```

2. Edit each file to add your actual secrets
3. Add these files to your `.gitignore` to prevent committing secrets

## CI/CD Configuration

In GitHub Actions, we use:

1. **GitHub Variables** for non-sensitive configuration
2. **GitHub Secrets** for sensitive data

### Naming Convention

Variables and secrets follow this naming convention:

- `<ENVIRONMENT>_<VARIABLE_NAME>` for GitHub Variables
- `<ENVIRONMENT>_<SECRET_NAME>` for GitHub Secrets

Examples:
- `STAGING_DJANGO_PORT` (GitHub Variable)
- `STAGING_DJANGO_SECRET_KEY` (GitHub Secret)

### Required GitHub Variables

For each environment (STAGING, DEMO, PROD), set these variables:

- `<ENV>_BACKEND_HOST`
- `<ENV>_WORKER_HOST`
- `<ENV>_DJANGO_PORT`
- `<ENV>_DEBUG`
- `<ENV>_DJANGO_ALLOWED_HOSTS`
- `<ENV>_DJANGO_CSRF_TRUSTED_ORIGINS`
- `<ENV>_CORS_ALLOWED_ORIGINS`
- `<ENV>_POSTGRES_DB`
- `<ENV>_POSTGRES_HOST`
- `<ENV>_POSTGRES_PORT`
- `<ENV>_MINIO_ENDPOINT`
- `<ENV>_MINIO_EXTERNAL_ENDPOINT`
- `<ENV>_MINIO_BUCKET_NAME`
- `<ENV>_ALLOWED_REDIRECT_URLS`
- `<ENV>_FILE_CACHE_LOCATION`

### Required GitHub Secrets

For each environment (STAGING, DEMO, PROD), set these secrets:

- `<ENV>_DJANGO_SECRET_KEY`
- `<ENV>_POSTGRES_USER`
- `<ENV>_POSTGRES_PASSWORD`
- `<ENV>_MINIO_ACCESS_KEY`
- `<ENV>_MINIO_SECRET_KEY`
- `<ENV>_REDIS_PASSWORD`
- `<ENV>_EMAIL_HOST`
- `<ENV>_EMAIL_PORT`
- `<ENV>_EMAIL_HOST_USER`
- `<ENV>_EMAIL_HOST_PASSWORD`
- `<ENV>_DEFAULT_FROM_EMAIL`
- `<ENV>_ADMIN_FIRST_NAME`
- `<ENV>_ADMIN_LAST_NAME`
- `<ENV>_ADMIN_EMAIL`
- `<ENV>_ADMIN_PASSWORD`

## Migrating from the Old Approach

If you're migrating from the old approach (single `STAGING_ENV_FILE` secret):

1. Extract all variables from your existing `.env` file
2. Create GitHub Variables for non-sensitive data
3. Create GitHub Secrets for sensitive data
4. Update your workflow files to use the new approach 