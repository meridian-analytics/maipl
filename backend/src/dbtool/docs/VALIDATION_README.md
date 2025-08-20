# Annotation File Validation Process

## Overview

This document describes the new validation process that was added to the database task processing workflow. The validation ensures that all audio files referenced in annotation CSV files exist in the audio folder before proceeding with the database creation process.

## Problem Statement

Previously, when processing database tasks with annotation files, the command-line tool (`ketos-create-db`) would attempt to process the annotation file line by line and look up each referenced audio file. If any files were missing, the tool would throw an exception, causing the entire task to fail in an ungraceful manner.

## Solution

A validation step has been added that runs **before** the database processing begins. This validation:

1. Reads the annotation CSV file line by line
2. Extracts filenames from the appropriate column
3. Checks if each referenced audio file exists in the audio folder
4. Logs any missing files with their line numbers
5. Terminates the task with an 'error' status if any files are missing

## Implementation Details

### New Function: `validate_annotation_files_exist()`

**Location**: `backend/src/dbtool/tasks.py`

**Purpose**: Validates that all audio files referenced in annotation CSV exist in the audio folder.

**Parameters**:
- `task_context`: Dictionary containing task context (audio_dir, annotation_dir, group config, etc.)
- `file_utils`: FileUtils instance for console output operations

**Returns**: 
- `True`: All files exist, validation passed
- `False`: Some files missing, validation failed

### Integration Point

The validation is called in the main task processing flow (`process_database_group`) right after all files are downloaded and before the database processing begins:

```python
# Step 4: Validate annotation files exist in audio folder
validation_successful = validate_annotation_files_exist(task_context, file_utils)
if not validation_successful:
    error_msg = "Annotation file validation failed - some audio files referenced in CSV are missing from audio folder"
    # ... log error details ...
    update_task_and_group_status(task_id, group_id, 'error', 'error')
    raise Exception(error_msg)
```

### New Status: 'error'

A new status value `'error'` has been added to both:
- `DatabaseTask.TASK_STATUS`
- `DatabaseGroup.GROUP_STATUS`

This status indicates that the task failed during validation (not during processing), allowing users to distinguish between different types of failures.

### Custom Exception Handling

A custom `ValidationError` exception class has been created to handle validation failures. This prevents the task from automatically retrying when validation fails, as validation failures are typically due to missing files that won't be resolved by retrying.

When validation fails:
1. Task and group status are set to 'error'
2. A `ValidationError` exception is raised
3. The exception is caught and handled without triggering retries
4. The task returns an error result and terminates gracefully

## Validation Process

### 1. CSV Column Detection

The validation function automatically detects the filename column by looking for common column names:
- `filename`
- `file`
- `file_path`
- `path`
- `audio_file`
- `audio_path`

If none of these are found, it looks for any column containing "file" or "path" in the name.

### 2. File Path Resolution

The function handles different path formats:
- Relative paths (e.g., `audio1.wav`)
- Subdirectory paths (e.g., `subfolder/audio2.wav`)
- Deep nested paths (e.g., `deep/nested/audio3.wav`)
- Cross-platform path separators (handles both `/` and `\`)

### 3. Error Reporting

When files are missing, the validation provides detailed information:
- Line number in the CSV where the file was referenced
- The filename that was referenced
- Total count of missing files

### 4. Console Output

All validation results are written to the console output file, including:
- Validation start message
- Column detection results
- Success/failure summary
- Detailed missing file information (if any)

## Example Console Output

### Successful Validation
```
Validating annotation files...
Annotation file: /path/to/annotation_1/annotations.csv
Audio directory: /path/to/audio_1
Using filename column: filename
Total columns: 4
Columns: filename, label, start_time, end_time

SUCCESS: Validation successful: All 3 audio files referenced in annotation CSV exist in audio folder
```

### Failed Validation
```
Validating annotation files...
Annotation file: /path/to/annotation_1/annotations.csv
Audio directory: /path/to/audio_1
Using filename column: filename
Total columns: 4
Columns: filename, label, start_time, end_time

ERROR: Validation failed: 1 audio files referenced in annotation CSV are missing from audio folder
Missing files:
  Line 3: subfolder/audio2.wav

TASK TERMINATED: Annotation file validation failed
Please check the console output above for details on missing files
Fix the missing files and retry the task
```

## Benefits

1. **Early Failure Detection**: Tasks fail fast during validation rather than during processing
2. **Clear Error Messages**: Users get specific information about what files are missing
3. **Graceful Handling**: No more unhandled exceptions from the command-line tool
4. **Better User Experience**: Users can fix missing files and retry without losing progress
5. **Comprehensive Logging**: All validation details are logged for debugging
6. **No Unnecessary Retries**: Validation failures don't trigger automatic task retries
7. **Clear Status Distinction**: 'error' status indicates validation failure vs 'failed' for processing failure

## User Workflow

1. **Task Creation**: User creates a database task with annotation files
2. **Task Execution**: Task starts and downloads all necessary files
3. **Validation**: System validates that all referenced audio files exist
4. **Success Path**: If validation passes, task continues with database processing
5. **Error Path**: If validation fails:
   - Task status is set to 'error'
   - Task terminates gracefully without retrying
   - Detailed error information is logged
   - User can view the console output to see what files are missing
   - User fixes the missing files
   - User manually retries the task

## Testing

A test script (`test_validation.py`) has been created to verify the validation function works correctly with various scenarios:
- All files exist
- Some files missing
- Different column names
- No annotations to validate

## Migration Requirements

The new 'error' status requires a database migration. Run:
```bash
python manage.py makemigrations dbtool
python manage.py migrate
```

## Future Enhancements

Potential improvements to consider:
1. **File Size Validation**: Check if audio files have valid content (not empty)
2. **File Format Validation**: Verify audio files are in supported formats
3. **Path Normalization**: Handle more complex path scenarios
4. **Batch Validation**: Validate multiple annotation files at once
5. **Interactive Mode**: Allow users to choose how to handle missing files
