# MAIPL - Marine Artificial Intelligence Platform

MAIPL (Marine Artificial Intelligence Platform) is a comprehensive full-stack application designed for processing and analyzing marine animal audio data. The platform provides a complete ecosystem for audio annotation, machine learning model training, model execution, and data management, specifically tailored for marine bioacoustics research.

## 🎯 Project Overview

MAIPL is built as a modular platform that enables researchers and scientists to:

- **Annotate Audio Data**: Create and manage audio annotations with custom schemas and batch processing capabilities
- **Train ML Models**: Develop and train machine learning models for marine animal detection and classification
- **Execute Models**: Run trained models on audio files and generate detection results
- **Manage Data**: Handle file uploads, sharing, and organization with robust metadata management
- **Evaluate Performance**: Generate metrics and visualizations to assess model performance
- **Deploy Infrastructure**: Provision and manage cloud infrastructure for scalable deployments

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

### Infrastructure & Deployment
- **Terraform**: Infrastructure as Code for cloud resource provisioning
- **Ansible**: Configuration management and automated deployments
- **Docker**: Containerized applications with multi-environment support
- **Monitoring**: Prometheus and Grafana for system monitoring

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
- **[Deployment Documentation](./deployment/README.md)** - Infrastructure provisioning, Ansible playbooks, and Terraform modules
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

### Infrastructure
- **Terraform** for infrastructure provisioning
- **Ansible** for configuration management
- **Docker** for containerization
- **Nginx** for reverse proxy
- **Prometheus & Grafana** for monitoring

## 📁 Project Structure

```
maipl/
├── frontend/          # React applications and UI components
├── backend/           # Django API and services
├── deployment/        # Infrastructure and deployment configurations
├── docs/             # Documentation site (Docusaurus)
└── scripts/          # Utility scripts
```

## 🤝 Contributing

Please refer to the individual component documentation for specific contribution guidelines:

- [Frontend Contributing Guide](./frontend/readme.md#development)
- [Backend Contributing Guide](./backend/readme.md#development-guidelines)
- [Deployment Contributing Guide](./deployment/README.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

For detailed setup instructions and component-specific information, please refer to the documentation links above.
