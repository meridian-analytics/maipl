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
docker compose run --rm bootstrap
```

Open the local services:

- MAIPL frontend: <http://localhost:8080/>
- Django API: <http://localhost:8000/>
- Django Admin: <http://localhost:8000/admin/>
- API documentation: <http://localhost:8000/swagger/>
- MinIO console: <http://localhost:9001/>
- RabbitMQ console: <http://localhost:15672/>

The local-only administrator is `admin@example.com` with password `change-me`.
MinIO uses `minioadmin` / `minioadmin-local`, and RabbitMQ uses
`rabbitmq` / `rabbitmq-local`. These defaults are for isolated development
only and must never be used for an exposed deployment.

Useful commands:

```bash
docker compose logs --follow backend worker
docker compose ps
docker compose down
docker compose down --volumes  # also removes all local MAIPL data
```

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
