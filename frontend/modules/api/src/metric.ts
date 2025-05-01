import type * as Client from "./client"
import * as K from "@maipl/constants"
import type { t_page_params,t_page } from "./types"

/** Metric.t */
type t = {
  /** Task id */
  id: number
  /** Background audio files */
  bg_audio_list?: Array<number>
  /** Output files */
  output_files: Array<number>
  /** Description */
  description: string | null
  /** Folder name of the output files */
  folder: string
  /** Parameters */
  parameters: {
    type: "clips" | "continuous"
    /** Minimum threshold value */
    threshold_min: number
    /** Maximum threshold value */
    threshold_max: number
    /** Threshold increment */
    threshold_increment: number
    /** Total time units */
    total_time_units: number
    /** Add background reference */
    add_ref?: boolean
  }
  /** Task status */
  status:
    | "CREATED"
    | "PENDING"
    | "STARTED"
    | "FAILURE"
    | "RUNNING"
    | "SUCCESS"
  /** Date created */
  created_at: Date
  /** Date updated */
  updated_at: Date
  /** Evaluation file */
  eval_file: number
  /** Reference file */
  ref_file: number
}

/** Metric.t_get_response */
type t_get_response = Omit<t, "created_at" | "updated_at"> & {
  created_at: string
  updated_at: string
}

/** Metric.t_create_request */
type t_create_request = Omit<
  t,
  "id" | "created_at" | "updated_at" | "status" | "output_files"
>

/** Metric.t_create_response */
type t_create_response = t_get_response

/** Task.t_filter_params */
type t_filter_params = {
  status?: string
  user_id?: number
}

/** Task.t_list_item */
type t_list_item = Omit<t, "created_at" | "updated_at"> 

/** Task.t_list_request */
type t_list_request = t_filter_params & t_page_params

/** Task.t_list_response */
type t_list_response = t_page<t_list_item>

/** Metric.create: create a new task */
const create = async (client: Client.t, body: t_create_request): Promise<t> => {
  const response = await client
    .post<t_create_response>(
      `${K.MAIPL_METRICS_BACKEND}/api/ketos/metrics/tasks/`,
      body
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

/** Metric.get: get a task by id */
const get = async (client: Client.t, id: number): Promise<t> => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_METRICS_BACKEND}/api/ketos/metrics/tasks/${id}/`
    )
    .then((r) => r.data)
  return response
}

/** Metric.remove: delete a task by id */
const remove = (client: Client.t, id: number): Promise<void> => {
  return client.delete(
    `${K.MAIPL_METRICS_BACKEND}/api/ketos/metrics/tasks/${id}/`
  )
}

/** Task.list: get list of tasks */
const list = async (
  client: Client.t,
  params?: t_list_request
): Promise<Array<t>> => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_METRICS_BACKEND}/api/ketos/metrics/tasks/`,
      { params }
    )
    .then((r) => r.data)
  return response.map((item) => ({
    ...item,
    created_at: new Date(item.created_at),
    updated_at: new Date(item.updated_at),
  }))
}

/** Metrics files: get json data by file_ids */
const files = async (
  client: Client.t,
  file_ids: Array<number>
): Promise<t_file_json_response> => {
  const response = await client
    .get<t_file_json_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/metrics/files/`,
      { params: { file_ids: file_ids.join(",") } }
    )
    .then((r) => r.data)
  return response
}

export {
  type t,
  type t_get_response,
  type t_create_request,
  type t_filter_params,
  type t_list_request,
  type t_list_response,
  type t_list_item,
  create,
  get,
  get_console,
  list,
  remove,
  files,
}
