# Database Tool Log API

This document describes the new log API endpoint for the dbtool application, which allows frontend applications to retrieve log files for database groups.

## Overview

The log API provides access to console output files generated during database processing tasks. Each database group has its own console output file that contains detailed information about the processing steps, including:

- Task and group initialization
- File download operations
- Database processing commands
- Error messages and warnings
- Processing statistics

## API Endpoint

### Get Group Log

**Endpoint:** `GET /api/dbtool/tasks/{task_id}/groups/{group_id}/log/`

**Authentication:** Required (user must own the task)

**Parameters:**
- `task_id` (integer): The ID of the database task
- `group_id` (integer): The ID of the database group within the task

**Response Format:**
```json
{
    "task_id": 123,
    "group_id": 456,
    "group_name": "/train",
    "log_content": "Task 123 - Group 456 started.......\nGroup name: /train\nGroup source: new_group\n==================================================\n...",
    "file_path": "/path/to/console/output/456/console.txt"
}
```

**Error Responses:**

- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Task, group, or log file not found
- `500 Internal Server Error`: Error reading log file

## Security

- Users can only access logs for tasks they own
- Authentication is required for all requests
- The API validates that the group belongs to the specified task and that the user owns the task

## Log File Structure

Log files are stored in the following directory structure:
```
{task_local_path}/
└── console_output/
    └── {group_id}/
        └── console.txt
```

## Example Usage

### Frontend JavaScript Example

```javascript
// Get log for a specific group
async function getGroupLog(taskId, groupId) {
    try {
        const response = await fetch(`/api/dbtool/tasks/${taskId}/groups/${groupId}/log/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Log content:', data.log_content);
            return data;
        } else {
            console.error('Failed to get log:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching log:', error);
    }
}

// Usage
getGroupLog(123, 456);
```

### Python Example

```python
import requests

def get_group_log(task_id, group_id, access_token):
    url = f"/api/dbtool/tasks/{task_id}/groups/{group_id}/log/"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

# Usage
log_data = get_group_log(123, 456, "your_access_token")
if log_data:
    print(log_data['log_content'])
```

## Integration with Existing System

The log API integrates seamlessly with the existing dbtool system:

1. **Console Output Generation**: Log files are automatically created during task processing
2. **File Management**: Logs are stored in the task's local directory structure
3. **User Authorization**: Uses the same authentication and authorization system as other dbtool endpoints
4. **Error Handling**: Provides consistent error responses with other dbtool APIs

## Troubleshooting

### Common Issues

1. **Log file not found**: This usually means the group hasn't been processed yet or the task doesn't have a local path set
2. **Permission denied**: Ensure the user owns the task and is properly authenticated
3. **Empty log content**: The group may still be in the initial processing stage

### Debugging

To debug log-related issues:

1. Check if the task has a `local_path` set
2. Verify the console output directory exists: `{task.local_path}/console_output/{group_id}/`
3. Check if the `console.txt` file exists and has content
4. Review the task and group status to ensure processing has started

## Future Enhancements

Potential improvements for the log API:

1. **Log streaming**: Real-time log updates during processing
2. **Log filtering**: Filter logs by log level, timestamp, or content
3. **Log retention**: Automatic cleanup of old log files
4. **Log search**: Full-text search within log content
5. **Log export**: Download logs in different formats (JSON, CSV, etc.)
