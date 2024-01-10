import * as K from "@maipl/constants"
import * as Client from "./client.ts"

/** Task.t */
type t = {
  /** Task identifier */
  id: number
  /** How many samples will be loaded into memory */
  batch_size: number
  /** The buffer duration to be added to each detection in seconds */
  buffer: number
  /** Celery task id */
  celery_task_id: string
  /** Date created */
  created_at: Date
  /** Description of the model runner task */
  description: string
  /** Detections */
  detections: number
  /** List of input files */
  filelist: Array<number>
  /** A flag indicating wheter to merge overlapping detections into a single detection */
  merge_detections: boolean
  /** Model file */
  model_file: number
  /** A flag to overwrite the detections, otherwise appends to it */
  overwrite: boolean
  /** Task status */
  status:
    | "CREATED"
    | "PENDING"
    | "STARTED"
    | "FAILURE"
    | "RETRY"
    | "REVOKED"
    | "SUCCESS"
  /** Step size in seconds */
  step_size: number
  /** The threshold value used to determine the cut-off point for detections */
  threshold: number
  /** Date updated */
  updated_at: Date
  /** User identifier */
  user_id: number
}

/** Task.t_get_response */
type t_get_response = Omit<t, "created_at" | "updated_at"> & {
  created_at: string
  updated_at: string
}

/** Task.t_create_request */
type t_create_request = Omit<
  t,
  | "id"
  | "celery_task_id"
  | "created_at"
  | "detections"
  | "merge_detections"
  | "overwrite"
  | "status"
  | "updated_at"
  | "user_id"
>

/** Task.t_create_response */
type t_create_response = t_get_response

/** Task.t_filter_params */
type t_filter_params = {
  status?: string
  user_id?: number
}

/** Task.t_list_request */
type t_list_request = t_filter_params

/** Task.t_list_response */
type t_list_response = Array<t_get_response>

/** Task.create: create a new task */
const create = async (client: Client.t, body: t_create_request): Promise<t> => {
  const response = await client
    .post<t_create_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/tasks/`,
      body,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

/** Task.delete: delete an existing task */
const delete_ = (client: Client.t, id: number): Promise<void> => {
  return client.delete(`${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/tasks/${id}/`)
}

/** Task.get: get task details */
const get = async (client: Client.t, id: number): Promise<t> => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/tasks/${id}/`,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

/** Task.list: get list of tasks */
const list = async (
  client: Client.t,
  params?: t_list_request,
): Promise<Array<t>> => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/tasks/`,
      { params },
    )
    .then(r => r.data)
  return response.map(item => ({
    ...item,
    created_at: new Date(item.created_at),
    updated_at: new Date(item.updated_at),
  }))
}

/** Task.start: start a task; enqueue with task runner */
const start = async (client: Client.t, id: number): Promise<t> => {
  const response = await client
    .post<t_get_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/tasks/${id}/`,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

export {
  type t,
  type t_create_request,
  type t_create_response,
  type t_filter_params,
  type t_get_response,
  type t_list_request,
  type t_list_response,
  create,
  delete_ as delete,
  get,
  list,
  start,
}
