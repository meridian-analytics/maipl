export interface DatabaseTask {
  id: string // For table compatibility
  task_id: string
  task_name: string
  description: string
  created_at: string
  updated_at: string
  status: "active" | "completed" | "failed" | "in_progress"
  audio_representation_config_id: number
  database_selection: {
    mode: "new_database" | "use_existing"
    database_file_id?: number
    original_database?: {
      filename: string
      size: number
      uploaded_at: string
    }
  }
  database_file: {
    filename: string
    size: number
    created_at: string
  }
  groups: DatabaseGroup[]
  output_settings: {
    database_filename: string
    table_name: string
    overwrite: boolean
    custom_module_id?: number
    seed?: number
  }
  // H5 Database metadata tracking
  database_metadata?: {
    hdf5_structure: Record<string, Record<string, string>>
    total_samples: number
    groups: string[]
  }
}

export interface DatabaseGroup {
  name: string
  created_at: string
  status: "completed" | "failed" | "in_progress" | "imported"
  source: "new_group" | "existing_database"
  config?: GroupConfig
  statistics: {
    file_count: number
    label_count: number
    total_samples: number
  }
}

export interface GroupConfig {
  audio_file_ids: number[]
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
  }
  avoid_annotations_file_id?: number
}

export interface CreateTaskRequest {
  task_name: string
  description: string
  audio_representation_config_id: number
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