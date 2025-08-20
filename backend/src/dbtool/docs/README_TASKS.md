# Database Group Processing Template Functions

This document describes the simplified template functions for handling database group creation and processing workflows.

## Overview

The database group creation process is now simplified:
1. **Group Creation**: When a group is created via API, processing starts automatically
2. **Celery Task Execution**: Background worker processes the database group
3. **Status Updates**: Task and group status are updated throughout the process
4. **Metadata Updates**: Database metadata is updated when processing completes

## Core Functions

### 1. Status Management Functions

#### `update_task_and_group_status()`
Updates the status of both the database task and the specific group atomically.

```python
from dbtool.tasks import update_task_and_group_status

success = update_task_and_group_status(
    task_id=123,
    group_id=456,
    task_status='in_progress',
    group_status='in_progress',
    celery_task_id='celery-task-uuid'
)
```

#### `start_database_processing_task()`
Starts a celery task to process the database group.

```python
from dbtool.tasks import start_database_processing_task

celery_task_id = start_database_processing_task(task_id=123, group_id=456)
```

### 2. Celery Task Function

#### `process_database_group()`
The main celery task that processes a database group. This is a template function that needs to be implemented with actual processing logic.

**Current Template Implementation:**
- Updates group statistics
- Marks processing as completed
- Updates database metadata
- Handles retries on failure

**TODO: Implement actual processing logic:**
- Process audio files based on `group.config`
- Generate database entries
- Handle existing database appending
- Call `update_database_file_metadata()` with complete HDF5 metadata

### 3. Metadata Management

#### `update_database_file_metadata()`
Updates the metadata of the actual database file after processing is complete. This should be called from the actual database processing logic.

```python
from dbtool.tasks import update_database_file_metadata

database_metadata = {
    'hdf5_structure': {...},
    'total_samples': 1000,
    'groups': ['/train', '/test'],
    # ... other metadata
}
success = update_database_file_metadata(task_id=123, database_metadata=database_metadata)
```

#### `update_database_metadata()`
Syncs task metadata with the actual database file metadata.

```python
from dbtool.tasks import update_database_metadata

success = update_database_metadata(task_id=123)
```

#### `update_group_statistics()`
Updates the statistics for a specific group after processing.

```python
from dbtool.tasks import update_group_statistics

success = update_group_statistics(group_id=456, processing_result={...})
```

#### Metadata Structure
Both task and database use the same HDF5 metadata structure:

```typescript
database_metadata: {
    hdf5_structure: Record<string, {
        datasets: Record<string, string>
        samples: number
    }>
    total_samples: number
    groups: string[]
    group_hierarchy?: Record<string, string[]>
    last_updated: string
    processing_completed: boolean
    task_id: number
    total_groups: number
    total_files: number
}
```

#### Metadata Flow
1. **Group Processing**: `update_group_statistics()` updates individual group statistics
2. **Database Processing**: `update_database_file_metadata()` updates the actual database file metadata
3. **Task Sync**: `update_database_metadata()` syncs task metadata with database file metadata

### 4. Cancellation

#### `cancel_database_processing()`
Cancels ongoing database processing for a group.

```python
from dbtool.tasks import cancel_database_processing

success = cancel_database_processing(task_id=123, group_id=456)
```

## Automatic Processing

### Group Creation Flow

When a group is created (via API, admin, or any other method):

1. **Group is saved** to the database
2. **Django signal triggers** automatically via `post_save` signal
3. **Processing starts automatically** via `start_database_processing_task()`
4. **Status is updated** to 'in_progress'
5. **Celery task runs** in the background
6. **Completion updates** status and metadata

### Model-Based Integration

The processing is handled at the model layer using Django signals:

1. **DatabaseGroup model**: Has `start_processing()` and `cancel_processing()` methods
2. **Post-save signal**: Automatically triggers processing when groups are created
3. **DatabaseTaskGroupsView**: Simple view that just saves the group
4. **DatabaseGroupProcessingView**: Uses model methods for manual control

### API Endpoints

- `POST /tasks/{task_id}/groups/` - Create group (automatically starts processing)
- `POST /tasks/{task_id}/groups/{group_id}/processing/` - Restart processing (optional)
- `DELETE /tasks/{task_id}/groups/{group_id}/processing/` - Cancel processing (optional)

## Implementation Notes

### Current Status
- ✅ Template functions created
- ✅ Automatic processing on group creation
- ✅ API integration simplified
- ⏳ Actual processing logic needs implementation
- ⏳ Database file handling needs implementation
- ⏳ Audio processing integration needed

### Next Steps
1. **Implement actual database processing logic** in `process_database_group()`
2. **Add audio file processing** based on group configuration
3. **Implement database file creation/appending** logic
4. **Add progress tracking** and real-time status updates
5. **Implement error recovery** and cleanup procedures

### Configuration
The processing behavior is controlled by:
- `group.config` - Contains audio file IDs, processing parameters
- `task.database_selection` - Controls new database vs. existing database
- `task.output_settings` - Database generation parameters

### Error Handling
- Celery tasks include retry logic with exponential backoff
- Database transactions ensure data consistency
- Comprehensive logging for debugging
- Graceful failure handling with status updates

## Example Usage

```python
# The workflow is now automatic - just create a group via API
# Processing starts automatically when the group is created

# 1. Create a group (processing starts automatically)
POST /tasks/123/groups/
{
    "name": "/train",
    "config": {
        "audio_file_ids": [1, 2, 3, 4, 5],
        "audio_representation_config_id": 456,
        "processing_settings": {
            "sample_rate": 16000,
            "normalize": True
        }
    }
}

# 2. Monitor processing status
GET /tasks/123/statistics/

# 3. Cancel if needed (optional)
DELETE /tasks/123/groups/456/processing/
```

## Model-Based Architecture

The architecture follows Django best practices:

```
API Request → Save Model → Signal Trigger → Start Processing → Background Worker → Update Status
```

### Benefits of Model-Based Approach:

1. **Separation of Concerns**: Views handle HTTP, models handle business logic
2. **Reusability**: Processing starts regardless of how the group is created (API, admin, management commands)
3. **Data Consistency**: Processing logic is tied to model lifecycle
4. **Django Best Practices**: Uses signals for automatic behavior
5. **Testability**: Easy to test model methods independently

### Model Methods:

```python
# Start processing
group = DatabaseGroup.objects.get(id=123)
celery_task_id = group.start_processing()

# Cancel processing
success = group.cancel_processing()

# Check status and metadata
status = group.status
statistics = group.statistics
hdf5_structure = group.get_hdf5_structure()
metadata_summary = group.get_metadata_summary()
``` 