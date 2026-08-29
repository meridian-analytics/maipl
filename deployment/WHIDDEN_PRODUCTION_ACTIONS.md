# Whidden production GitHub Actions configuration

The production workflow is manual-only. All deployment inputs default to
`false`; enable only the component being deployed.

## Repository variables

| Variable | Whidden value |
| --- | --- |
| `REGISTRY_URL` | `192.168.57.49:8080` |
| `FRONTEND_HOST` | `192.168.57.110` |
| `PROD_BACKEND_HOST_A` | `192.168.57.182` |
| `PROD_BACKEND_HOST_B` | `192.168.57.58` |
| `PROD_WORKER_HOST_A` | `192.168.57.41` |
| `PROD_WORKER_HOST_B` | `192.168.57.164` |
| `PROD_WORKER_HOST_C` | `192.168.57.22` |
| `POSTGRES_HOST` | `192.168.57.26` |
| `REDIS_HOST` | `192.168.57.159` |
| `CELERY_BROKER_URL_HOST` | `192.168.57.94` |
| `MINIO_ENDPOINT` | `192.168.57.38:9000` |
| `MINIO_EXTERNAL_ENDPOINT` | `minio.maipl.meridian.cs.dal.ca` |
| `PROD_POSTGRES_DB` | `maipl-prod` |
| `PROD_MINIO_BUCKET_NAME` | `maipl-prod` |
| `PROD_REDIS_DB` | `2` |
| `PROD_DJANGO_ALLOWED_HOSTS` | `maipl.meridian.cs.dal.ca,api.maipl.meridian.cs.dal.ca,192.168.57.182,192.168.57.58,localhost,127.0.0.1` |
| `PROD_DJANGO_CSRF_TRUSTED_ORIGINS` | `https://api.maipl.meridian.cs.dal.ca,https://maipl.meridian.cs.dal.ca` |
| `PROD_CORS_ALLOWED_ORIGINS` | `https://maipl.meridian.cs.dal.ca,https://api.maipl.meridian.cs.dal.ca` |
| `PROD_ALLOWED_REDIRECT_URLS` | `https://maipl.meridian.cs.dal.ca` |

Confirm the public MinIO hostname and TLS route before relying on generated
external object URLs. Internal application traffic uses `MINIO_ENDPOINT`.

## Repository secrets

Update or verify these without copying their values into this document:

- `SSH_PRIVATE_KEY`: key authorized on the Whidden application nodes.
- `REGISTRY_USERNAME` and `REGISTRY_PASSWORD`: Whidden Harbor credentials.
- `PROD_POSTGRES_USER` and `PROD_POSTGRES_PASSWORD`: Whidden PostgreSQL
  application credentials.
- `PROD_MINIO_ACCESS_KEY` and `PROD_MINIO_SECRET_KEY`: Whidden MinIO
  application credentials.
- `CELERY_BROKER_URL_USER` and `CELERY_BROKER_URL_PASSWORD`: Whidden RabbitMQ
  application credentials.
- `PROD_DJANGO_SECRET_KEY`: preserve the current production Django key unless
  a deliberate rotation is planned.
- `EMAIL_HOST_PASSWORD`: mail is not yet migrated; do not reuse an obsolete
  credential unintentionally.

Local migration workspace secret files are the source of truth for Whidden
service credentials. Never paste their contents into commits, logs, or issues.

## CPU worker rollout

After all variables and secrets are verified, manually run **Production Build
& Deploy** with only `deploy_workers=true`. This reuses the existing production
worker image and does not deploy the frontend or backends.

Verify all three `ketos-worker` containers and confirm RabbitMQ reports three
consumers before submitting production jobs. Start with a task that does not
require CUDA.
