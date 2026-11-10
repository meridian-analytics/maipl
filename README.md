# MAIPL - Marine Artificial Intelligence Platform

MAIPL (Marine Artificial Intelligence Platform) is a comprehensive full-stack application designed for processing and analyzing marine animal audio data. The platform provides a complete ecosystem for audio annotation, machine learning model training, model execution, and data management, specifically tailored for marine bioacoustics research.

## Quick Start

The local stack requires Docker Engine 24 or newer with Docker Compose v2.
The first backend build downloads the scientific Python and Ketos dependencies
and can take several minutes.

```bash
git clone https://github.com/meridian-analytics/maipl.git
cd maipl
docker compose up --build --detach
```

The first startup automatically runs database migrations, verifies the required
roles and permissions, creates the local administrator, and initializes the
required object-storage buckets. It also builds MinIO and its client from the
final upstream community source releases because pre-built community images
are no longer published.

Open the local services:

- MAIPL frontend: <http://localhost:8080/>
- Django API: <http://localhost:8000/>
- Django Admin: <http://localhost:8000/admin/>
- API documentation: <http://localhost:8000/swagger/>
- MinIO console: <http://localhost:9001/>
- RabbitMQ console: <http://localhost:15672/>

If one of these host ports is already in use, it can be changed without
editing Compose. The available overrides are `MAIPL_DEV_FRONTEND_PORT`,
`MAIPL_DEV_BACKEND_PORT`, `MAIPL_DEV_MINIO_API_PORT`,
`MAIPL_DEV_MINIO_CONSOLE_PORT`, and `MAIPL_DEV_RABBITMQ_CONSOLE_PORT`.

The local-only administrator is `admin@example.com` with password `change-me`.
MinIO uses `minioadmin` / `minioadmin-local`, and RabbitMQ uses
`rabbitmq` / `rabbitmq-local`. These defaults are for isolated development
only and must never be used for an exposed deployment.

Useful commands:

```bash
docker compose logs --follow backend worker
docker compose ps
docker compose run --rm bootstrap  # re-check local initialization
docker compose down
docker compose down --volumes  # also removes all local MAIPL data
```

### Live frontend development through one port

Use the development override to run all Vite applications with hot module
replacement behind one Nginx gateway. The individual Vite ports remain inside
the Docker network; the browser only connects to port `8080`.

```bash
docker compose -f compose.yml -f compose.dev.yml up --build
```

Open <http://localhost:8080/>. Application routes match production, including
`/annotation-tool`, `/file-service`, and `/model-runner`. Source changes under
`frontend/` are reflected without rebuilding or merging to `main`.

For private access from another computer, forward only the gateway port:

```bash
ssh -L 8080:localhost:8080 user@development-host
```

Then open <http://localhost:8080/> on the local computer. To expose the gateway
through an HTTPS development hostname, point the reverse proxy at port `8080`
with WebSocket support and start the stack with values matching that hostname:

```bash
MAIPL_DEV_ORIGIN=https://dev.example.org \
MAIPL_DEV_HOST=dev.example.org \
MAIPL_DEV_ALLOWED_HOSTS=dev.example.org,backend \
MAIPL_DEV_HMR_PORT=443 \
MAIPL_DEV_MINIO_ENDPOINT=storage.dev.example.org \
MAIPL_DEV_MINIO_HTTPS=true \
docker compose -f compose.yml -f compose.dev.yml up --build
```

The storage hostname must proxy the MinIO S3 API on port `9000` and allow
large request bodies. It is required because media URLs are signed for the
browser; leaving the default `localhost:9000` value is only appropriate when
the browser and Compose stack run on the same computer.

Keep a remotely exposed development environment behind authentication or an
IP allowlist. Do not expose the individual Vite, database, or storage ports.

### Create an annotation batch

Upload WAV or FLAC files in **Files**, then create a batch in **Annotation
Tool**. The annotation configuration defaults to the built-in `KW`, `HB`,
`KW+HB`, and `Background` schema, so a new installation can process and
annotate a batch without uploading a configuration file first. To use a
project-specific form, upload a JSON file containing `schema` and `uiSchema`
and select it when creating the batch; that selection overrides the built-in
default for that batch.

The selected configuration is copied into the batch when it is created.
Changing or deleting an uploaded schema later therefore does not change
existing batches. Uploaded schemas must be owned by, or shared with, the user
creating the batch.

For component-level development, see the frontend and backend documentation
below. Production infrastructure and credentials are intentionally not part
of this public repository.

## 🎯 Project Overview

MAIPL is built as a modular platform that enables researchers and scientists to:

- **Annotate Audio Data**: Create and manage audio annotations with custom schemas and batch processing capabilities
- **Train ML Models**: Develop and train machine learning models for marine animal detection and classification
- **Execute Models**: Run trained models on audio files and generate detection results
- **Manage Data**: Handle file uploads, sharing, and organization with robust metadata management
- **Evaluate Performance**: Generate metrics and visualizations to assess model performance
- **Run Reproducibly**: Use containerized services for local development and deployment

## 🏗️ Architecture

The platform consists of four main components:

### Frontend Applications
- **Annotation Tool**: Interactive audio annotation interface with spectrogram visualization
- **Authentication Service**: User authentication and session management
- **Database Tool**: Database management and task configuration
- **File Service**: File upload, management, and sharing interface
- **Metrics Dashboard**: Performance metrics visualization and analysis
- **Model Runner**: Interface for executing trained models
- **Model Trainer**: Configuration and monitoring of model training tasks

### Backend Services
- **Django REST API**: Core backend services with JWT authentication
- **File Management**: MinIO-based object storage with sharing capabilities
- **Annotation System**: Batch processing and segment management
- **Model Operations**: Training, execution, and evaluation services
- **User Management**: Role-based access control and permissions
- **Background Tasks**: Celery-based asynchronous processing

### Runtime Services
- **Docker**: Containerized applications and development dependencies
- **PostgreSQL**: Relational application data
- **MinIO**: S3-compatible object storage
- **Redis and RabbitMQ**: Caching and asynchronous task delivery

### Documentation
- **Docusaurus Site**: Comprehensive documentation and user guides
- **API Documentation**: Interactive Swagger/ReDoc documentation
- **Development Guides**: Setup and contribution instructions

## 📚 Documentation

### Project Documentation
- **Main Documentation Site**: [https://docs.maipl.meridian.cs.dal.ca/](https://docs.maipl.meridian.cs.dal.ca/)
- **API Documentation**: Available at `/swagger/` and `/redoc/` endpoints

### Component-Specific Documentation
- **[Frontend Documentation](./frontend/readme.md)** - React applications, UI components, and development setup
- **[Backend Documentation](./backend/readme.md)** - Django API, services, and database management
- **[Docs Documentation](./docs/README.md)** - Documentation site development and content management

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **pnpm** for package management
- **Biome** for linting and formatting

### Backend
- **Django 4.2** with Django REST Framework
- **PostgreSQL** for primary database
- **MinIO** for object storage
- **Redis** for caching and task queue
- **Celery** for background tasks

### Runtime
- **Docker** for containerization
- **Nginx** for serving frontend applications
- **Celery**, **Redis**, and **RabbitMQ** for background processing
- **PostgreSQL** and **MinIO** for persistent data

## 📁 Project Structure

```
maipl/
├── frontend/          # React applications and UI components
├── backend/           # Django API and services
├── docs/             # Documentation site (Docusaurus)
└── scripts/          # Utility scripts
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the component documentation:

- [Frontend Contributing Guide](./frontend/readme.md#development)
- [Backend Contributing Guide](./backend/readme.md#development-guidelines)

## 📄 License

Copyright (C) 2023-2026 Dalhousie University.

MAIPL is licensed under the GNU General Public License version 3. See
[LICENSE](LICENSE) for details. MAIPL builds on
[Ketos](https://git-dev.cs.dal.ca/meridian/ketos), which is also licensed
under GPLv3.

---

For detailed setup instructions and component-specific information, please refer to the documentation links above.
