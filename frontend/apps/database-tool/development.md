# Frontend Design Document: Ketos Database Creation Interface

## **Overview**
A web-based interface for managing the creation and population of Ketos audio databases using the `ketos_create_db` command-line tool. The interface manages database creation as tasks, handling group creation and database state management through integration with existing file browsing components.

## **Implementation Status: COMPLETED ✅**

### **Completed Features**
- ✅ **API Integration**: Full integration with backend `/api/ketos/dbtool/` endpoints
- ✅ **Authentication**: JWT-based authentication using MaiplProvider
- ✅ **Task Management**: Create, read, update, delete operations for database tasks
- ✅ **Group Management**: Add, list, update, delete operations for database groups
- ✅ **Error Handling**: Comprehensive null checks and error recovery
- ✅ **UI Components**: Complete task list, task details, and group management interfaces
- ✅ **Metadata Display**: Shows groups, samples, and database structure information
- ✅ **Responsive Design**: Clean, modern UI with proper loading states

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

## **API Integration Implementation**

### **Backend API Endpoints**
The frontend integrates with the following backend endpoints:

```
/api/ketos/dbtool/
├── tasks/
│   ├── /                    # List/Create tasks
│   ├── <id>/               # Task detail
│   ├── <id>/status/        # Update task status
│   ├── <id>/statistics/    # Task statistics
│   └── <id>/groups/        # Groups within task
│       ├── /               # List/Create groups
│       ├── <group_id>/     # Group detail
│       └── <group_id>/status/ # Update group status
└── groups/                 # Global groups
    ├── /                   # List/Create groups
    ├── <id>/              # Group detail
    └── <id>/status/       # Update group status
```

### **Frontend API Client**
- **Location**: `frontend/apps/database-tool/src/api/client.ts`
- **Authentication**: Uses `MaiplProvider` for JWT token management
- **Error Handling**: Comprehensive error handling with user notifications
- **Type Safety**: Full TypeScript integration with backend types

### **Key API Operations**
- **Task CRUD**: Create, read, update, delete database tasks
- **Group Management**: Add groups to tasks, manage group status
- **Metadata Sync**: Automatic metadata synchronization by backend
- **Status Polling**: Real-time status updates for long-running operations

## **User Interface Structure**

### **1. Task Management Dashboard** ✅
- **Task List**: Overview of all database creation tasks with groups and samples count
- **Task Status**: Active, completed, failed, or in progress with visual indicators
- **Quick Actions**: View details, delete task, refresh data
- **Task Creation**: Start new database creation task with comprehensive form

### **2. Task Workspace** ✅
- **Task Overview Panel**: Current task information, status, and metadata
- **Database Groups Panel**: Unified display of all groups (database + task groups)
- **Group Creation**: Interface for adding new groups to existing tasks
- **Metadata Display**: Shows total samples, group counts, and sample distribution

### **3. Group Configuration Interface** ✅
- **Group Naming**: Input for group path (e.g., /train, /test)
- **File Selection Integration**: Interface with existing file browser
- **Annotation File Selection**: Selection from existing files using file browser
- **Label Mapping**: Dynamic key-value pairs for label assignments
- **Advanced Settings**: Collapsible section for optional parameters

## **User Workflow**

### **Phase 1: Task Initialization** ✅
1. User creates new database creation task
2. User chooses between "New Database" or "Use Existing Database"
3. If using existing database: User selects HDF5 database from file browser
4. System generates unique task ID
5. User selects initial audio files using existing file browser
6. User configures first group parameters
7. System triggers backend to create database with first group

### **Phase 2: Group Addition** ✅
1. User selects "Add Group" option from task workspace
2. System shows current database state and available files
3. User selects files for new group using existing file browser
4. User configures group-specific parameters
5. System triggers backend to append new group to database

### **Phase 3: Task Completion** ✅
1. User reviews all groups in database
2. User can download or share the final database file
3. Task can be archived or deleted

## **Data Structure Implementation**

### **Task Metadata Structure**
```typescript
interface DatabaseTask {
  id: number                    // Task identifier
  task_name: string            // Task name
  description: string          // Task description
  created_at: Date             // Creation timestamp
  updated_at: Date             // Last update timestamp
  status: "active" | "completed" | "failed" | "in_progress"
  database_selection: {
    mode: "new_database" | "use_existing"
    database_file_id?: number
    original_database?: {
      filename: string
      size: number
      uploaded_at: string
    }
  }
  database_file?: {            // Optional for new tasks
    filename: string
    size: number
    created_at: string
  }
  groups?: DatabaseGroup[]     // Optional for new tasks
  output_settings: {
    database_filename: string
    overwrite: boolean
    custom_module_id?: number
    seed?: number
  }
  database_metadata?: {        // HDF5 database metadata
    hdf5_structure: Record<string, {
      datasets: Record<string, string>
      samples: number
    }>
    total_samples: number
    groups: string[]
    group_hierarchy?: Record<string, string[]>
  }
  celery_task_id?: string      // Background task tracking
}
```

### **Group Metadata Structure**
```typescript
interface DatabaseGroup {
  id: number                   // Group identifier
  name: string                 // Group path (e.g., "/train")
  created_at: Date             // Creation timestamp
  status: "completed" | "failed" | "in_progress" | "imported"
  source: "new_group" | "existing_database"
  config?: GroupConfig         // Optional for imported groups
  statistics: {
    file_count: number
    label_count: number
    total_samples: number
  }
  celery_task_id?: string      // Background task tracking
}
```

## **Key Interface Components**

### **Database Selection Interface** ✅
- **Database Mode Selection**: Radio buttons for "New Database" vs "Use Existing Database"
- **Existing Database Browser**: File browser integration for HDF5 database selection
- **Database Preview**: Show existing groups and structure of selected database
- **Database Information**: Display metadata about selected database

### **File Selection Integration** ✅
- **File Browser Integration**: Interface with existing file browsing component
- **Selected Files Display**: Show currently selected files for the group
- **File Count Indicators**: Display number of files selected
- **File Validation**: Ensure selected files are valid audio formats

### **Group Configuration Forms** ✅
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

### **Progress and Status Indicators** ✅
- **Database Creation Progress**: Progress indicators for backend operations
- **Task Status**: Visual indicators for task states with color-coded chips
- **Group Addition Status**: Success/failure indicators for group operations
- **Error Handling**: Clear error messages and recovery options

### **Database State Visualization** ✅
- **Group Overview**: Unified display of all groups (database + task groups)
- **Sample Distribution**: Shows sample counts for each group
- **Database Size**: Information about database file size and contents
- **Metadata Display**: Total samples, group counts, and structure information

## **State Management**

### **Task State** ✅
- Task metadata (ID, database file information)
- List of existing groups and their configurations
- Current task status and progress
- Integration state with file browser component
- Database source information (new vs existing)

### **Form State** ✅
- Current group configuration being edited
- File selection state (from file browser integration)
- Form validation status
- Unsaved changes indicators
- Database selection state

### **UI State** ✅
- Current view/panel being displayed
- Collapsed/expanded sections
- Loading states and progress indicators
- Error states and messages

## **Form Validation and Error Handling** ✅

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
- Database creation failures with user-friendly messages
- Group addition failures with retry options
- File selection errors with validation feedback
- Network connectivity issues with retry mechanisms
- Authentication errors with proper redirects

### **Recovery Mechanisms**
- Retry failed operations
- Resume interrupted group creation
- Recover from partial database states
- Clean up failed tasks

## **Component Integration** ✅

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

## **Security Considerations** ✅

### **File Access Security**
- File ID validation for all file references
- User permission validation for file access
- File type validation for selected files

### **Data Privacy**
- Secure transmission of form data via HTTPS
- User data isolation through authentication
- Audit logging for database operations

## **Performance Considerations** ✅

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

## **Implementation Details**

### **Authentication Flow**
- Uses `MaiplProvider` for JWT token management
- Automatic token refresh and error handling
- Secure API client creation with authenticated requests

### **API Client Architecture**
- Modular API client with type-safe operations
- Centralized error handling and notifications
- Automatic retry logic for failed requests
- Real-time status updates for long-running operations

### **UI Component Structure**
- **DatabaseTasks**: Main task list with pagination and selection
- **TaskWorkspace**: Detailed task view with groups and actions
- **CreateTaskDialog**: Task creation form with validation
- **AddGroupDialog**: Group addition form with file selection
- **TaskConfigurationView**: Task configuration display
- **TaskActions**: Task-specific actions (view, delete, download)

### **Error Handling Strategy**
- Comprehensive null checks for optional fields
- Graceful degradation for missing data
- User-friendly error messages
- Automatic retry for transient failures
- Fallback displays for missing metadata

### **Data Synchronization**
- Backend-driven metadata synchronization
- Automatic updates after group operations
- Real-time status polling for background tasks
- Optimistic UI updates with rollback on failure

## **Testing and Quality Assurance**

### **Build Process**
- TypeScript compilation with strict type checking
- Vite build optimization for production
- Component testing with React Testing Library
- API integration testing with mock endpoints

### **Error Scenarios Handled**
- Network connectivity issues
- Authentication token expiration
- Missing or malformed API responses
- File access permission errors
- Database operation failures

## **Future Enhancements**

### **Planned Features**
- Real-time collaboration on database tasks
- Advanced database visualization tools
- Batch operations for multiple tasks
- Enhanced progress tracking for long operations
- Database comparison and merging tools

### **Performance Optimizations**
- Virtual scrolling for large task lists
- Lazy loading for task details
- Optimistic updates for better UX
- Background data prefetching

## **Deployment and Maintenance**

### **Build Configuration**
- Production-optimized builds with code splitting
- Environment-specific configurations
- Asset optimization and compression
- Security headers and CSP configuration

### **Monitoring and Logging**
- Error tracking and reporting
- Performance monitoring
- User interaction analytics
- API usage metrics

---

**Last Updated**: January 2025
**Implementation Status**: Complete ✅
**Next Phase**: Testing and deployment
