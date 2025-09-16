export interface DatabaseTask {
  id: number // For table compatibility and API consistency
  task_name: string
  description: string
  created_at: string
  updated_at: string
  status: "active" | "completed" | "failed" | "error" | "in_progress"
  database_selection: {
    mode: "new_database" | "use_existing"
    database_file_id?: number
    original_database?: {
      filename: string
      size: number
      uploaded_at: string
    }
  }
  database_file?: {
    filename: string
    size: number
    created_at: string
  }
  groups?: DatabaseGroup[]
  output_settings: {
    database_filename: string
    overwrite: boolean
    custom_module_id?: number
    seed?: number
  }
  // Database file reference (the actual metadata is in the database file itself)
  database_file?: number
  // Database metadata from existing database files
  database_metadata?: {
    groups: string[]
    total_samples: number
    hdf5_structure: Record<string, {
      samples: number
      datasets: Record<string, string>
    }>
    group_hierarchy?: Record<string, string[]>
  }
  // Celery task ID for processing
  celery_task_id?: string
}

export interface DatabaseGroup {
  id: number
  name: string
  created_at: string
  status: "completed" | "failed" | "error" | "in_progress" | "imported"
  source: "new_group" | "existing_database"
  config?: GroupConfig
  statistics: {
    status: string
    task_id: number
    datasets: Record<string, string>
    group_id: number
    file_size: number
    local_path: string
    output_path: string
    processed_at: string
    total_samples: number
    processed_files: number
    processing_time: number
    database_file_id: number
    upload_successful: boolean
    command_successful: boolean
    processing_successful: boolean
    file_count?: number
    label_count?: number
  }
  // Celery task ID for processing
  celery_task_id?: string
}

export interface GroupConfig {
  audio_file_ids: number[]
  audio_representation_config_id: number
  annotations?: {
    file_id: number
    labels: Record<string, number>
    annotation_step: number
    step_min_overlap: number
    only_augmented: boolean
  }
  random_selections?: {
    num_samples: number | "same"
    label: number
    filename_filter_file_id?: number
    seed?: number
  }
  avoid_annotations_file_id?: number
}

export interface CreateTaskRequest {
  task_name: string
  description: string
  database_selection: {
    mode: "new_database" | "use_existing"
    database_file_id?: number
  }
}

export interface AddGroupRequest {
  task_id: string
  operation: "add_group"
  group_config: GroupConfig
  output_settings: {
    database_filename: string
    overwrite: boolean
  }
} 