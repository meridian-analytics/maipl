# Database Tool Backend Design

## System Architecture

### High-Level Components
1. **API Gateway** - Handles HTTP requests and authentication
2. **Task Manager** - Creates and manages database tasks
3. **Queue System** - Manages task processing queue
4. **Worker Pool** - Executes database processing tasks
5. **File Cache** - Local storage for downloaded files
6. **Database** - Stores task metadata and file references

### Data Flow
```
User Request → API Gateway → Task Manager → Queue System → Worker Pool → File Cache → Database
```

## Core Data Models

### Database Task
Represents a database creation or modification task.

**Key Fields:**
- `task_id` - Unique identifier
- `task_name` - Human-readable name
- `description` - Optional description
- `status` - Task processing status
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `audio_config_id` - Audio configuration reference
- `database_selection` - New or existing database choice
- `database_file_id` - Reference to generated database file
- `groups` - List of audio groups
- `output_settings` - Database generation parameters
- `queue_tasks` - List of queue task references
- `task_status` - Overall task status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- `queue_task_statuses` - Status of individual queue tasks
    - `task_id` - Queue task identifier 
    - `status` - Individual task status (PENDING, RUNNING, SUCCESS, FAILURE)
    - `created_at` - Task creation time
    - `completed_at` - Task completion time
    - `error_details` - Error information if failed

### Audio Group
Represents a collection of audio files with processing configuration.

**Key Fields:**
- `name` - Group identifier (e.g., "/train", "/test")
- `created_at` - Creation timestamp
- `queue_task_status` - Reference to queue task status tracking processing state
- `source` - New group or from existing database
- `config` - Processing configuration
- `statistics` - Processing results

### File Model (Existing)
Reuses existing file system model for database files.

**Key Fields:**
- `id` - File identifier
- `path` - File location
- `size` - File size
- `created_at` - Creation timestamp
- `updated_at` - Last modification
- `meta` - File metadata (HDF5 structure, etc.)

## File System Design

### Cache Directory Structure
```
/cache/
├── audio_files/          # Downloaded audio files
├── annotation_files/     # Downloaded annotation files
├── config_files/         # Downloaded configuration files
└── temp/                 # Temporary processing directories
    └── {task_id}/        # Task-specific temporary files
```

### File Management Strategy
- **Download on Demand** - Files downloaded when needed for processing
- **Cache Validation** - Verify file integrity and freshness
- **LRU Eviction** - Remove least recently used files
- **Size Management** - Maintain cache within size limits
- **Parallel Downloads** - Download multiple files concurrently

## Queue System Design

### Task Queue Structure
- **Priority Levels** - High, normal, low priority tasks
- **Task Types** - Database creation, group processing
- **Retry Logic** - Exponential backoff for failed tasks
- **Dead Letter Queue** - Handle permanently failed tasks
- **Task Metadata** - Progress tracking and error information

### Queue Operations
- **Enqueue** - Add task to processing queue
- **Dequeue** - Worker retrieves next task
- **Acknowledge** - Worker confirms task processing
- **Retry** - Re-queue failed tasks with backoff
- **Cancel** - Remove task from queue

## API Design

### Task Management Endpoints

#### Create Database Task
**POST** `/api/database-tasks`

**Request:**
```json
{
  "task_name": "Whale Detection Database",
  "description": "Database for training whale call detection model",
  "audio_representation_config_id": 15,
  "database_selection": {
    "mode": "new_database"
  },
  "output_settings": {
    "database_filename": "whale_detection_db.h5",
    "table_name": "/data",  //optional, default to /data for new database, invalid for existing database
  }
}
```

**Response:**
```json
{
  "id": "task_12345",
  "status": "pending",
}
```

#### Add Group to Task
**POST** `/api/database-tasks/{taskId}/groups`

**Request:**
```json
{
  "name": "/train",
  "audio_file_ids": [101, 102, 103, 104],
  "annotations": {
    "file_id": 201,
    "labels": {
      "background": 0,
      "upcall": 1,
      "grunt": 2
    },
    "annotation_step": 0.5,
    "step_min_overlap": 0.7,
    "only_augmented": false
  }
}
```

**Response:**
```json
{
  "task_id": "task_12345",
  "group_name": "/train",
  "status": "pending",
  "queue_task_id": "queue_67891"
}
```

#### Get Task Status
**GET** `/api/database-tasks/{taskId}/status`

**Response:**
```json
{
  "task_id": "task_12345",
  "status": "in_progress",
  "progress": {
    "current_step": "Processing audio files",
    "total_steps": 5,
    "completed_steps": 2,
    "percentage": 40
  },
  "estimated_completion": "2024-01-15T11:30:00Z",
  "logs": [
    "Downloaded 4 audio files",
    "Processing audio file 1/4"
  ]
}
```

### Task Listing and Management

#### List Tasks
**GET** `/api/database-tasks`

**Query Parameters:**
- `page` - Page number
- `size` - Page size
- `status` - Filter by status
- `search` - Search in task names

**Response:**
```json
{
  "data": [
    {
      "task_id": "task_12345",
      "task_name": "Whale Detection Database",
      "status": "completed",
      "created_at": "2024-01-15T10:00:00Z",
      "groups": [
        {
          "name": "/train",
          "status": "completed",
          "statistics": {
            "file_count": 4,
            "total_samples": 150
          }
        }
      ]
    }
  ],
  "count": 25,
  "page": 1,
  "size": 10
}
```

#### Delete Task
**DELETE** `/api/database-tasks/{taskId}`

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

## Processing Workflows

### Database Creation Workflow
1. **Task Creation**
   - Validate request parameters
   - Create task record
   - Enqueue processing task
   - Return task ID

2. **File Preparation**
   - Download audio configuration file
   - Create temporary directory
   - Initialize HDF5 structure

3. **Database Generation**
   - Process audio files
   - Generate HDF5 database
   - Update file model
   - Update task metadata

4. **Completion**
   - Clean up temporary files
   - Update task status
   - Notify completion

### Group Processing Workflow
1. **Task Enqueue**
   - Validate group configuration
   - Update task with new group
   - Enqueue processing task

2. **File Download**
   - Download audio files
   - Download annotation files
   - Verify file integrity

3. **Processing**
   - Process audio with annotations/random selection
   - Add data to existing database
   - Update metadata

4. **Completion**
   - Update group statistics
   - Update task metadata
   - Clean up files

## Error Handling Strategy

### Error Categories
- **Temporary Errors** - Network issues, file locks
- **Configuration Errors** - Invalid parameters, missing files
- **Processing Errors** - Audio processing failures
- **System Errors** - Database issues, worker crashes

### Error Response Format
```json
{
  "error": "Failed to process audio files",
  "error_type": "processing",
  "retry_count": 2,
  "max_retries": 3,
  "next_retry": "2024-01-15T11:15:00Z",
  "details": {
    "failed_files": [101, 102],
    "reason": "Invalid audio format"
  }
}
```

### Retry Strategy
- **Exponential Backoff** - Increase delay between retries
- **Maximum Retries** - Limit retry attempts
- **Error Classification** - Different handling per error type
- **Dead Letter Queue** - Handle permanently failed tasks

## Monitoring and Observability

### Key Metrics
- **Queue Metrics** - Length, processing rate, wait times
- **Worker Metrics** - Health, availability, processing times
- **File Cache Metrics** - Hit rates, download times, storage usage
- **Task Metrics** - Success rates, processing times, error rates

### Health Checks
- **Queue Health** - Queue system availability
- **Worker Health** - Worker process status
- **File Cache Health** - Storage availability and performance
- **Database Health** - Connection and query performance

### Logging Strategy
- **Task Logs** - Processing steps and progress
- **Error Logs** - Detailed error information
- **Performance Logs** - Timing and resource usage
- **Audit Logs** - Task creation and modification

## Performance Considerations

### Scalability
- **Horizontal Scaling** - Add more workers as needed
- **Queue Partitioning** - Separate queues by priority or type
- **Load Balancing** - Distribute tasks across workers
- **Resource Management** - Monitor and limit resource usage

### Optimization
- **Batch Processing** - Group similar tasks
- **Parallel Processing** - Process multiple files concurrently
- **Caching Strategy** - Optimize file cache usage
- **Database Optimization** - Efficient queries and indexing

### Resource Management
- **Memory Limits** - Prevent memory exhaustion
- **Disk Space** - Manage cache and temporary files
- **CPU Usage** - Limit processing intensity
- **Network Bandwidth** - Control download rates