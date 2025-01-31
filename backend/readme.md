# MAIPL Backend Overview

## Core Function
MAIPL (Marine Artificial Intelligence PLatform) is a Django-based backend application designed for processing and analyzing marine animal audio data. The system provides functionality for file management, audio processing, model training, and metrics evaluation.

## Key Components

### 1. File Management System
- Handles file uploads and storage using MinIO backend
- Supports file sharing between users
- Maintains file metadata and versioning
- Enforces user-specific file organization

### 2. User Management
- Custom user model with email-based authentication
- JWT-based authentication system
- Role-based access control
- User permission management

### 3. Annotation System
- Supports batch processing of audio files
- Allows creation and management of audio segments
- Handles audio annotations with metadata
- Processes and stores spectrograms and audio clips

### 4. Model Training System
- Manages ML model training tasks
- Supports custom training configurations
- Tracks training progress and metrics
- Handles model versioning

### 5. Model Runner System
- Executes trained models on audio files
- Manages detection tasks
- Stores and organizes detection results
- Supports batch processing

### 6. Metrics System
- Evaluates model performance
- Generates performance metrics
- Supports background processing
- Provides visualization data

## API Endpoints

### Authentication
- `/api/` - User authentication and management endpoints

### File Management
- `/api/file/` - File upload, download, and management endpoints
- Supports file sharing and permission management

### Annotation
- `/api/annotation/` - Annotation creation and management
- Batch processing endpoints
- Segment management

### Model Operations
- `/api/ketos/run/` - Model execution endpoints
- `/api/ketos/train/` - Model training endpoints
- `/api/ketos/metrics/` - Model evaluation endpoints

### Documentation
- `/swagger/` - Swagger UI for API documentation
- `/redoc/` - ReDoc UI for API documentation

## Technical Stack

### Core Framework
- Django
- Django REST Framework
- Celery for background tasks

### Storage
- MinIO for file storage
- PostgreSQL for database
- Redis for caching

### Authentication
- JWT for API authentication
- Django Guardian for object-level permissions

### Documentation
- drf-yasg for API documentation
- Swagger/ReDoc UI

## Key Features

1. **Scalable Architecture**
   - Modular design with separate apps
   - Background task processing
   - Distributed file storage

2. **Security**
   - JWT-based authentication
   - Object-level permissions
   - Secure file handling

3. **Performance**
   - Async task processing
   - Efficient file handling
   - Optimized database queries

4. **Extensibility**
   - Modular design
   - Plugin architecture
   - API-first approach

## Environment Configuration
The application supports various environment configurations through environment variables, including:
- Database settings
- Storage settings
- Authentication settings
- Email settings
- API configurations

## Development Guidelines
1. Follow Django's MVT pattern
2. Use class-based views for complex operations
3. Implement proper error handling
4. Maintain API documentation
5. Write unit tests for new features
