# Frontend Design Document: Ketos Database Creation Interface

## **Overview**
A web-based interface for managing the creation and population of Ketos audio databases using the `ketos_create_db` command-line tool. The interface manages database creation as tasks, handling group creation and database state management through integration with existing file browsing components.

## **Core Concepts**

### **Task-Based Architecture**
- Each database creation process is managed as a "task"
- Tasks maintain their own database files and state
- Tasks can span multiple group additions over time
- Task state persists across user sessions

### **Database Groups**
- Each task can contain multiple groups (e.g., /train, /test, /validation)
- Groups are created sequentially and added to the same HDF5 database file
- Each group can have different file selections, annotations, and configurations

### **File Integration**
- **File Browser Integration**: Leverages existing file browsing component for file selection
- **File ID System**: All files are referenced by integer IDs
- **Database Selection**: Users can select existing HDF5 databases as starting points

## **User Interface Structure**

### **1. Task Management Dashboard**
- **Task List**: Overview of all database creation tasks
- **Task Status**: Active, completed, failed, or in progress
- **Quick Actions**: Resume task, view details, delete task
- **Task Creation**: Start new database creation task

### **2. Task Workspace**
- **Task Overview Panel**: Current task information and status
- **Database Groups Panel**: List of existing groups in the database
- **File Selection Panel**: Integration with existing file browser component
- **Group Creation Form**: Interface for adding new groups

### **3. Group Configuration Interface**
- **Group Naming**: Input for group path (e.g., /train, /test)
- **File Selection Integration**: Interface with existing file browser
- **Annotation File Selection**: Selection from existing files using file browser
- **Label Mapping**: Dynamic key-value pairs for label assignments
- **Advanced Settings**: Collapsible section for optional parameters

## **User Workflow**

### **Phase 1: Task Initialization**
1. User creates new database creation task
2. User chooses between "New Database" or "Use Existing Database"
3. If using existing database: User selects HDF5 database from file browser
4. System generates unique task ID
5. User selects initial audio files using existing file browser
6. User configures first group parameters
7. System triggers backend to create database with first group

### **Phase 2: Group Addition**
1. User selects "Add Another Group" option
2. System shows current database state and available files
3. User selects files for new group using existing file browser
4. User configures group-specific parameters
5. System triggers backend to append new group to database

### **Phase 3: Task Completion**
1. User reviews all groups in database
2. User can download or share the final database file
3. Task can be archived or deleted

## **API Request Structure and Backend Commands**

### **Task Creation with New Database**
```json
{
  "task_id": "task_12345",
  "task_name": "Whale Detection Database",
  "audio_representation_config_id": 15,
  "database_selection": {
    "mode": "new_database"
  },
  "group_config": {
    "name": "/train",
    "audio_file_ids": [2, 344, 56, 789],
    "annotations": {
      "file_id": 23,
      "labels": {"background": 0, "upcall": 1, "grunt": 2},
      "annotation_step": 0.5,
      "step_min_overlap": 0.7,
      "only_augmented": false
    }
  },
  "output_settings": {
    "database_filename": "whale_detection_db.h5",
    "table_name": "/data",
    "overwrite": false,
    "seed": 42
  }
}
```

**Backend Commands:**
```bash
# 1. Download files to cache folder
# (Backend resolves file IDs and downloads to cache folder)

# 2. Execute ketos_create_db command
python ketos_create_db.py \
  /cache/task_12345/audio_files \
  /cache/task_12345/config_15.json \
  --annotations /cache/task_12345/annotations_23.csv \
  --labels background=0 upcall=1 grunt=2 \
  --annotation_step 0.5 \
  --step_min_overlap 0.7 \
  --table_name /data \
  --output /cache/task_12345/whale_detection_db.h5 \
  --seed 42
```

### **Task Creation with Existing Database**
```json
{
  "task_id": "task_12346",
  "task_name": "Continue Whale Detection Work",
  "audio_representation_config_id": 15,
  "database_selection": {
    "mode": "use_existing",
    "database_file_id": 456
  },
  "group_config": {
    "name": "/test",
    "audio_file_ids": [20, 21],
    "annotations": {
      "file_id": 22,
      "labels": {"background": 0, "upcall": 1, "grunt": 2},
      "annotation_step": 0,
      "step_min_overlap": 0.5,
      "only_augmented": false
    }
  },
  "output_settings": {
    "database_filename": "whale_detection_db.h5",
    "overwrite": false
  }
}
```

**Backend Commands:**
```bash
# 1. Download existing database and new files to cache
# (Backend downloads database file 456 and new audio files to cache)

# 2. Execute ketos_create_db command (append mode)
python ketos_create_db.py \
  /cache/task_12346/audio_files \
  /cache/task_12346/config_15.json \
  --annotations /cache/task_12346/annotations_22.csv \
  --labels background=0 upcall=1 grunt=2 \
  --annotation_step 0 \
  --step_min_overlap 0.5 \
  --table_name /test \
  --output /cache/task_12346/whale_detection_db.h5 \
  --overwrite False
```

### **Adding Group to Existing Task**
```json
{
  "task_id": "task_12345",
  "operation": "add_group",
  "group_config": {
    "name": "/validation",
    "audio_file_ids": [30, 31, 32],
    "random_selections": {
      "num_samples": 500,
      "label": 0,
      "filename_filter_file_id": 25
    },
    "avoid_annotations_file_id": 26
  },
  "output_settings": {
    "database_filename": "whale_detection_db.h5",
    "overwrite": false
  }
}
```

**Backend Commands:**
```bash
# 1. Download new files to existing cache folder
# (Backend downloads new audio files, filter file, and avoidance annotations to cache)

# 2. Execute ketos_create_db command (append mode)
python ketos_create_db.py \
  /cache/task_12345/audio_files \
  /cache/task_12345/config_15.json \
  --random_selections 500 0 /cache/task_12345/filter_25.txt \
  --avoid_annotations /cache/task_12345/avoid_26.csv \
  --table_name /validation \
  --output /cache/task_12345/whale_detection_db.h5 \
  --overwrite False
```

### **Creating Database with Random Selections Only**
```json
{
  "task_id": "task_12347",
  "task_name": "Background Noise Database",
  "audio_representation_config_id": 15,
  "database_selection": {
    "mode": "new_database"
  },
  "group_config": {
    "name": "/background",
    "audio_file_ids": [10, 11],
    "random_selections": {
      "num_samples": 1000,
      "label": 0,
      "filename_filter_file_id": 12
    },
    "avoid_annotations_file_id": 13
  },
  "output_settings": {
    "database_filename": "background_db.h5",
    "table_name": "/data",
    "overwrite": false,
    "seed": 123
  }
}
```

**Backend Commands:**
```bash
# 1. Download files to cache folder
# (Backend downloads audio files, config, filter file, and avoidance annotations)

# 2. Execute ketos_create_db command
python ketos_create_db.py \
  /cache/task_12347/audio_files \
  /cache/task_12347/config_15.json \
  --random_selections 1000 0 /cache/task_12347/filter_12.txt \
  --avoid_annotations /cache/task_12347/avoid_13.csv \
  --table_name /data \
  --output /cache/task_12347/background_db.h5 \
  --seed 123
```

## **Task JSON Examples**

### **Task with New Database**
```json
{
  "task_id": "task_12345",
  "task_name": "Whale Detection Database",
  "description": "Database for training whale call detection model",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:45:00Z",
  "status": "active",
  "audio_representation_config_id": 15,
  "database_selection": {
    "mode": "new_database",
    "database_file_id": null
  },
  "database_file": {
    "filename": "whale_detection_db.h5",
    "size": 1048576,
    "created_at": "2024-01-15T11:45:00Z"
  },
  "groups": [
    {
      "name": "/train",
      "created_at": "2024-01-15T11:45:00Z",
      "status": "completed",
      "source": "new_group",
      "config": {
        "audio_file_ids": [2, 344, 56, 789],
        "annotations": {
          "file_id": 23,
          "labels": {"background": 0, "upcall": 1, "grunt": 2},
          "annotation_step": 0.5,
          "step_min_overlap": 0.7,
          "only_augmented": false
        },
        "random_selections": null,
        "avoid_annotations_file_id": null
      },
      "statistics": {
        "file_count": 4,
        "label_count": 3,
        "total_samples": 150
      }
    }
  ],
  "output_settings": {
    "database_filename": "whale_detection_db.h5",
    "table_name": "/data",
    "overwrite": false,
    "custom_module_id": null,
    "seed": 42
  }
}
```

### **Task with Existing Database**
```json
{
  "task_id": "task_12346",
  "task_name": "Continue Whale Detection Work",
  "description": "Adding new groups to existing database",
  "created_at": "2024-01-16T09:15:00Z",
  "updated_at": "2024-01-16T10:30:00Z",
  "status": "active",
  "audio_representation_config_id": 15,
  "database_selection": {
    "mode": "use_existing",
    "database_file_id": 456,
    "original_database": {
      "filename": "whale_detection_v1.h5",
      "size": 5242880,
      "uploaded_at": "2024-01-10T14:20:00Z"
    }
  },
  "database_file": {
    "filename": "whale_detection_db.h5",
    "size": 6291456,
    "created_at": "2024-01-16T10:30:00Z"
  },
  "groups": [
    {
      "name": "/train",
      "created_at": "2024-01-10T14:20:00Z",
      "status": "imported",
      "source": "existing_database",
      "config": null,
      "statistics": {
        "file_count": 3,
        "label_count": 2,
        "total_samples": 75
      }
    },
    {
      "name": "/test",
      "created_at": "2024-01-16T10:30:00Z",
      "status": "completed",
      "source": "new_group",
      "config": {
        "audio_file_ids": [20, 21],
        "annotations": {
          "file_id": 22,
          "labels": {"background": 0, "upcall": 1, "grunt": 2},
          "annotation_step": 0,
          "step_min_overlap": 0.5,
          "only_augmented": false
        },
        "random_selections": null,
        "avoid_annotations_file_id": null
      },
      "statistics": {
        "file_count": 2,
        "label_count": 3,
        "total_samples": 50
      }
    }
  ],
  "output_settings": {
    "database_filename": "whale_detection_db.h5",
    "table_name": "/data",
    "overwrite": false,
    "custom_module_id": null,
    "seed": null
  }
}
```

## **Key Interface Components**

### **Database Selection Interface**
- **Database Mode Selection**: Radio buttons for "New Database" vs "Use Existing Database"
- **Existing Database Browser**: File browser integration for HDF5 database selection
- **Database Preview**: Show existing groups and structure of selected database
- **Database Information**: Display metadata about selected database

### **File Selection Integration**
- **File Browser Integration**: Interface with existing file browsing component
- **Selected Files Display**: Show currently selected files for the group
- **File Count Indicators**: Display number of files selected
- **File Validation**: Ensure selected files are valid audio formats

### **Group Configuration Forms**
- **Required Fields Section**:
  - Audio representation configuration file selection (from file browser)
  - Group name/path input
  - File selection integration

- **Annotation Section** (conditional):
  - Annotation file selection from existing files using file browser
  - Label mapping interface with add/remove functionality
  - Time-shift settings (annotation step, minimum overlap)
  - Augmentation options (only augmented checkbox)

- **Random Selection Section** (conditional):
  - Number of samples input (number or "same")
  - Label assignment input
  - Avoidance annotations file selection from existing files

- **Output Settings Section**:
  - Database filename input
  - Overwrite options (checkbox)
  - Custom module path input (from file browser)
  - Seed value input

### **Progress and Status Indicators**
- **Database Creation Progress**: Progress indicators for backend operations
- **Task Status**: Visual indicators for task states
- **Group Addition Status**: Success/failure indicators for group operations
- **Error Handling**: Clear error messages and recovery options

### **Database State Visualization**
- **Group Overview**: Tree view of database structure
- **File Distribution**: Charts showing file distribution across groups
- **Label Distribution**: Statistics on label assignments
- **Database Size**: Information about database file size and contents

## **State Management**

### **Task State**
- Task metadata (ID, database file information)
- List of existing groups and their configurations
- Current task status and progress
- Integration state with file browser component
- Database source information (new vs existing)

### **Form State**
- Current group configuration being edited
- File selection state (from file browser integration)
- Form validation status
- Unsaved changes indicators
- Database selection state

### **UI State**
- Current view/panel being displayed
- Collapsed/expanded sections
- Loading states and progress indicators
- Error states and messages

## **Form Validation and Error Handling**

### **Form Validation**
- Required field validation
- File format validation for annotation files
- Path format validation (e.g., table names must start with "/")
- Cross-field validation (e.g., annotation step requires annotations)
- File selection validation (ensure files are selected)
- Database selection validation (ensure valid HDF5 file)

### **Integration Validation**
- File browser component state validation
- Selected file format validation
- File count validation (minimum/maximum requirements)
- Database compatibility validation

### **Error Handling**
- Database creation failures
- Group addition failures
- File selection errors
- Network connectivity issues

### **Recovery Mechanisms**
- Retry failed operations
- Resume interrupted group creation
- Recover from partial database states
- Clean up failed tasks

## **Component Integration**

### **File Browser Integration**
- **Props Interface**: Define required props for file browser component
- **Event Handling**: Handle file selection/deselection events
- **State Synchronization**: Keep file selection state in sync
- **Validation Integration**: Validate selected files before submission
- **File ID Resolution**: Convert file browser selections to integer IDs

### **Backend API Integration**
- **Task Management Endpoints**: Create, update, delete tasks
- **Group Creation Endpoints**: Add groups to existing databases
- **Status Polling**: Monitor backend operation progress
- **Error Handling**: Handle API errors and timeouts
- **File ID Management**: Handle integer file IDs for all file references

## **Security Considerations**

### **File Access Security**
- File ID validation for all file references
- User permission validation for file access
- File type validation for selected files

### **Data Privacy**
- Secure transmission of form data
- User data isolation
- Audit logging for database operations

## **Performance Considerations**

### **File Management**
- Efficient file ID resolution
- Optimized file browser integration
- Smart caching strategies for frequently accessed files
- Background file validation

### **UI Responsiveness**
- Asynchronous form submissions
- Progress indicators for file operations
- Non-blocking UI updates
- Optimistic UI updates where appropriate
