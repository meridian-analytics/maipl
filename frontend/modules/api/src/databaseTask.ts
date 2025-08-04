import * as K from "@maipl/constants"
import type * as Client from "./client"
import type { t_page, t_page_params } from "./types"

/** DatabaseTask.t: database task details */
type t = {
  /** Task identifier */
  id: number
  /** Task name */
  task_name: string
  /** Task description */
  description: string
  /** Date when task was created */
  created_at: Date
  /** Date when task was last updated */
  updated_at: Date
  /** Task status */
  status: "active" | "completed" | "failed" | "in_progress"
  /** Database selection configuration */
  database_selection: {
    mode: "new_database" | "use_existing"
    database_file_id?: number
    original_database?: {
      filename: string
      size: number
      uploaded_at: string
    }
  }
  /** Database file information */
  database_file: {
    filename: string
    size: number
    created_at: string
  }
  /** Groups within this task */
  groups: DatabaseGroup[]
  /** Output settings */
  output_settings: {
    database_filename: string
    overwrite: boolean
    custom_module_id?: number
    seed?: number
  }
  /** H5 Database metadata tracking */
  database_metadata?: {
    /** HDF5 file structure - maps group paths to dataset info and sample count */
    hdf5_structure: Record<string, {
      /** Dataset mappings */
      datasets: Record<string, string>
      /** Number of samples in this group */
      samples: number
    }>
    /** Total number of samples across all groups */
    total_samples: number
    /** List of group paths in the database (including nested) */
    groups: string[]
    /** Group hierarchy - maps parent groups to their children */
    group_hierarchy?: Record<string, string[]>
  }
  /** Celery task ID for processing */
  celery_task_id?: string
}

/** DatabaseGroup.t: database group details */
type t_group = {
  /** Group identifier */
  id: number
  /** Group name */
  name: string
  /** Date when group was created */
  created_at: Date
  /** Group status */
  status: "completed" | "failed" | "in_progress" | "imported"
  /** Group source */
  source: "new_group" | "existing_database"
  /** Group configuration */
  config?: GroupConfig
  /** Group statistics */
  statistics: {
    file_count: number
    label_count: number
    total_samples: number
  }
  /** Celery task ID for processing */
  celery_task_id?: string
}

/** GroupConfig.t: group configuration */
type GroupConfig = {
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

/** DatabaseTask.t_create_request */
type t_create_request = {
  task_name: string
  description: string
  database_selection: {
    mode: "new_database" | "use_existing"
    database_file_id?: number
  }
  output_settings: {
    database_filename: string
    overwrite: boolean
    custom_module_id?: number
    seed?: number
  }
  groups?: Array<{
    name: string
    source: "new_group"
    config: GroupConfig
  }>
}

/** DatabaseTask.t_create_response */
type t_create_response = Omit<t, "created_at" | "updated_at"> & { 
  created_at: string
  updated_at: string
}

/** DatabaseTask.t_get_response */
type t_get_response = Omit<t, "created_at" | "updated_at"> & { 
  created_at: string
  updated_at: string
}

/** DatabaseTask.t_update_request */
type t_update_request = Partial<Omit<t, "id" | "created_at" | "updated_at">>

/** DatabaseTask.t_status_update_request */
type t_status_update_request = {
  status: "active" | "completed" | "failed" | "in_progress"
  celery_task_id?: string
}

// Note: Metadata updates are handled automatically by the backend
// after group processing completes

/** DatabaseTask.t_list_item: a summarized task, returned by DatabaseTask.list */
type t_list_item = Omit<t, "groups">

/** DatabaseTask.t_list_request */
type t_list_request = t_page_params

/** DatabaseTask.t_list_response */
type t_list_response = t_page<
  Omit<t_list_item, "created_at" | "updated_at"> & { 
    created_at: string
    updated_at: string
  }
>

/** DatabaseTask.t_statistics_response */
type t_statistics_response = {
  total_groups: number
  completed_groups: number
  failed_groups: number
  total_samples: number
  total_files: number
}

/** DatabaseGroup.t_create_request */
type t_group_create_request = {
  name: string
  source: "new_group"
  config: GroupConfig
}

/** DatabaseGroup.t_create_response */
type t_group_create_response = Omit<t_group, "created_at"> & { 
  created_at: string
}

/** DatabaseGroup.t_get_response */
type t_group_get_response = Omit<t_group, "created_at"> & { 
  created_at: string
}

/** DatabaseGroup.t_update_request */
type t_group_update_request = Partial<Omit<t_group, "id" | "created_at">>

/** DatabaseGroup.t_status_update_request */
type t_group_status_update_request = {
  status: "completed" | "failed" | "in_progress" | "imported"
  celery_task_id?: string
  statistics?: {
    file_count: number
    label_count: number
    total_samples: number
  }
}

// Note: Group metadata updates are handled automatically by the backend
// after group processing completes

/** DatabaseGroup.t_list_item: a summarized group, returned by DatabaseGroup.list */
type t_group_list_item = Omit<t_group, "config">

/** DatabaseGroup.t_list_request */
type t_group_list_request = t_page_params

/** DatabaseGroup.t_list_response */
type t_group_list_response = t_page<
  Omit<t_group_list_item, "created_at"> & { 
    created_at: string
  }
>

/** DatabaseTask.create: create a new database task */
const create = async (client: Client.t, body: t_create_request): Promise<t> => {
  const response = await client
    .post<t_create_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/`,
      body
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

/** DatabaseTask.list: get paginated list of database tasks */
const list = async (
  client: Client.t,
  params: t_list_request
): Promise<t_page<t_list_item>> => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/`,
      { params }
    )
    .then((r) => r.data)
  return {
    ...response,
    data: response.data.map((item) => ({
      ...item,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
    })),
  }
}

/** DatabaseTask.get: get database task details */
const get = async (client: Client.t, id: number): Promise<t> => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${id}/`
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

/** DatabaseTask.update: update an existing database task */
const update = (client: Client.t, id: number, body: t_update_request): Promise<void> => {
  return client.put(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${id}/`,
    body
  )
}

/** DatabaseTask.delete: delete an existing database task */
const delete_ = (client: Client.t, id: number): Promise<void> => {
  return client.delete(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${id}/`
  )
}

/** DatabaseTask.updateStatus: update database task status */
const updateStatus = (client: Client.t, id: number, body: t_status_update_request): Promise<void> => {
  return client.patch(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${id}/status/`,
    body
  )
}

/** DatabaseTask.getStatistics: get database task statistics */
const getStatistics = async (client: Client.t, id: number): Promise<t_statistics_response> => {
  return client
    .get<t_statistics_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${id}/statistics/`
    )
    .then((r) => r.data)
}

// Note: Metadata synchronization is handled automatically by the backend
// after group processing completes. No manual metadata update endpoints needed.

/** DatabaseGroup.create: create a new group within a task */
const createGroup = async (client: Client.t, taskId: number, body: t_group_create_request): Promise<t_group> => {
  const response = await client
    .post<t_group_create_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${taskId}/groups/`,
      body
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  }
}

/** DatabaseGroup.list: get paginated list of groups within a task */
const listGroups = async (
  client: Client.t,
  taskId: number,
  params: t_group_list_request
): Promise<t_page<t_group_list_item>> => {
  const response = await client
    .get<t_group_list_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${taskId}/groups/`,
      { params }
    )
    .then((r) => r.data)
  return {
    ...response,
    data: response.data.map((item) => ({
      ...item,
      created_at: new Date(item.created_at),
    })),
  }
}

/** DatabaseGroup.get: get group details within a task */
const getGroup = async (client: Client.t, taskId: number, groupId: number): Promise<t_group> => {
  const response = await client
    .get<t_group_get_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${taskId}/groups/${groupId}/`
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  }
}

/** DatabaseGroup.update: update an existing group within a task */
const updateGroup = (client: Client.t, taskId: number, groupId: number, body: t_group_update_request): Promise<void> => {
  return client.put(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${taskId}/groups/${groupId}/`,
    body
  )
}

/** DatabaseGroup.delete: delete an existing group within a task */
const deleteGroup = (client: Client.t, taskId: number, groupId: number): Promise<void> => {
  return client.delete(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${taskId}/groups/${groupId}/`
  )
}

/** DatabaseGroup.updateStatus: update group status within a task */
const updateGroupStatus = (client: Client.t, taskId: number, groupId: number, body: t_group_status_update_request): Promise<void> => {
  return client.patch(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/tasks/${taskId}/groups/${groupId}/status/`,
    body
  )
}

// Note: Group metadata synchronization is handled automatically by the backend
// after group processing completes. No manual metadata update endpoints needed.

/** DatabaseGroup.createGlobal: create a new group globally */
const createGlobalGroup = async (client: Client.t, body: t_group_create_request): Promise<t_group> => {
  const response = await client
    .post<t_group_create_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/groups/`,
      body
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  }
}

/** DatabaseGroup.listGlobal: get paginated list of all groups */
const listGlobalGroups = async (
  client: Client.t,
  params: t_group_list_request
): Promise<t_page<t_group_list_item>> => {
  const response = await client
    .get<t_group_list_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/groups/`,
      { params }
    )
    .then((r) => r.data)
  return {
    ...response,
    data: response.data.map((item) => ({
      ...item,
      created_at: new Date(item.created_at),
    })),
  }
}

/** DatabaseGroup.getGlobal: get global group details */
const getGlobalGroup = async (client: Client.t, groupId: number): Promise<t_group> => {
  const response = await client
    .get<t_group_get_response>(
      `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/groups/${groupId}/`
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  }
}

/** DatabaseGroup.updateGlobal: update an existing global group */
const updateGlobalGroup = (client: Client.t, groupId: number, body: t_group_update_request): Promise<void> => {
  return client.put(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/groups/${groupId}/`,
    body
  )
}

/** DatabaseGroup.deleteGlobal: delete an existing global group */
const deleteGlobalGroup = (client: Client.t, groupId: number): Promise<void> => {
  return client.delete(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/groups/${groupId}/`
  )
}

/** DatabaseGroup.updateGlobalStatus: update global group status */
const updateGlobalGroupStatus = (client: Client.t, groupId: number, body: t_group_status_update_request): Promise<void> => {
  return client.patch(
    `${K.MAIPL_DATABASE_TOOL_BACKEND}/api/ketos/dbtool/groups/${groupId}/status/`,
    body
  )
}

export {
  type t,
  type t_group,
  type GroupConfig,
  type t_create_request,
  type t_create_response,
  type t_get_response,
  type t_update_request,
  type t_status_update_request,
  type t_list_item,
  type t_list_request,
  type t_list_response,
  type t_statistics_response,
  type t_group_create_request,
  type t_group_create_response,
  type t_group_get_response,
  type t_group_update_request,
  type t_group_status_update_request,
  type t_group_list_item,
  type t_group_list_request,
  type t_group_list_response,
  create,
  list,
  get,
  update,
  delete_ as delete,
  updateStatus,
  getStatistics,
  createGroup,
  listGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  updateGroupStatus,
  createGlobalGroup,
  listGlobalGroups,
  getGlobalGroup,
  updateGlobalGroup,
  deleteGlobalGroup,
  updateGlobalGroupStatus,
} 