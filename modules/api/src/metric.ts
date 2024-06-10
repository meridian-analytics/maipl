import type * as Client from "./client"
import * as K from "@maipl/constants"

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
  /** Type of metric */
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
  add_bg_ref?: boolean
  /** Background label */
  bg_label?: string | null
  /** Task status */
  status:
    | "CREATED"
    | "PENDING"
    | "STARTED"
    | "FAILURE"
    | "RETRY"
    | "REVOKED"
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

/** Task.t_list_request */
type t_list_request = t_filter_params

/** Task.t_list_response */
type t_list_response = Array<t_get_response>

/** Metric.create: create a new task */
const create = async (client: Client.t, body: t_create_request): Promise<t> => {
  const response = await client
    .post<t_create_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/metrics/tasks/`,
      body
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

/** Task.list: get list of tasks */
const list = async (
  client: Client.t,
  params?: t_list_request
): Promise<Array<t>> => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/metrics/tasks/`,
      { params }
    )
    .then((r) => r.data)
  return response.map((item) => ({
    ...item,
    created_at: new Date(item.created_at),
    updated_at: new Date(item.updated_at),
  }))
}

export {
  type t,
  type t_get_response,
  type t_create_request,
  type t_filter_params,
  type t_list_request,
  type t_list_response,
  create,
  list,
}
