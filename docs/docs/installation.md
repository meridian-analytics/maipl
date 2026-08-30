---
sidebar_position: 2
title: Local installation
---

# Local installation

MAIPL provides an automated local bootstrap so that a new installation does
not depend on undocumented database or object-storage steps.

## Prerequisites

- Git
- Docker Engine 24 or newer
- Docker Compose v2
- At least 16 GB of RAM and 20 GB of free disk space

The backend image includes Ketos and TensorFlow. Its first build is several
gigabytes and may take several minutes.

## Start the stack

```bash
git clone https://github.com/meridian-analytics/maipl.git
cd maipl
docker compose up --build --detach
docker compose run --rm bootstrap
docker compose ps
```

The bootstrap command is idempotent: it is safe to run again. It verifies the
database seed data and Constance configuration, then creates the configured
administrator if it does not exist. It does not reset an existing password.

To explicitly reset the local administrator password:

```bash
docker compose run --rm bootstrap \
  python manage.py bootstrap_maipl --reset-admin-password
```

## What is automated

| Component | Initialization |
| --- | --- |
| PostgreSQL | Database and application user are created by the official image. |
| Django schema | `manage.py migrate` runs before Gunicorn starts. |
| Groups | `admin`, `user`, and `guest` are created by Django migrations. |
| Annotation roles | Viewer, Contributor, Viewer-Contributor, and Manager, including their permissions, are created by migrations. |
| Constance | Defaults come from `api/settings.py`; the bootstrap verifies that the database-backed configuration is available. Overrides can be made in Django Admin. |
| MinIO | The `maipl-dev` and `static` buckets are created by the one-shot `minio-init` service. Buckets are private by default. |
| Administrator | The explicit `bootstrap` command creates or verifies the administrator. |
| Worker | The CPU Celery worker starts after the backend becomes healthy. |

Database roles and permissions belong in versioned migrations, not in a
manual installation checklist. MinIO buckets and policies belong in an
idempotent one-shot container or provisioning command. Documentation explains
these operations, but automation remains the source of truth.

## Local credentials

The tracked Compose defaults are intentionally limited to an isolated local
machine:

| Service | Username | Password |
| --- | --- | --- |
| Django administrator | `admin@example.com` | `change-me` |
| MinIO | `minioadmin` | `minioadmin-local` |
| RabbitMQ | `rabbitmq` | `rabbitmq-local` |
| PostgreSQL | `maipl` | `maipl-local` |

Never expose this stack to a network with these credentials. Real deployments
must use a secret manager or environment-specific secrets and a distinct,
least-privilege MinIO service account.

## Create users

For local development, sign up through the authentication frontend or send a
registration request:

```bash
curl --request POST http://localhost:8000/api/auth/register/ \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "researcher@example.com",
    "first_name": "Marine",
    "last_name": "Researcher",
    "password": "replace-with-a-strong-password"
  }'
```

Registration normally sends an activation email. When SMTP is not configured,
an administrator can activate the account in the
[Django user administration page](http://localhost:8000/admin/user/user/).

## Service URLs

- Frontend: [http://localhost:8080/](http://localhost:8080/)
- API: [http://localhost:8000/](http://localhost:8000/)
- Django Admin: [http://localhost:8000/admin/](http://localhost:8000/admin/)
- Swagger: [http://localhost:8000/swagger/](http://localhost:8000/swagger/)
- MinIO console: [http://localhost:9001/](http://localhost:9001/)
- RabbitMQ console: [http://localhost:15672/](http://localhost:15672/)

## Stop or reset

```bash
docker compose down
docker compose down --volumes  # permanently removes local databases and objects
```

## Production note

The root Compose file is a reproducible development environment, not a
production topology. Production deployments should provide external secrets,
TLS, backups, monitoring, restricted object-storage policies, and separately
managed persistence.
