import * as K from "@maipl/constants"
import type * as Client from "./client"
import * as File from "./file"
import type { t_page, t_page_params } from "./types"

/** Detection.t */
type t = {
  created_at: Date
  end: number
  file: number
  file_path: string
  filename: string
  id: number
  label: string
  score: number
  start: number
  task: number
  user_id: number
}

/** Detection.t_get_response */
type t_get_response = Omit<t, "created_at"> & {
  created_at: string
}

/** Detection.t_filter_params */
type t_filter_params = {
  file?: number
  label?: string
  model?: number
  score_max?: number
  score_min?: number
  task?: number
  user_id?: number
}

/** Detection.t_list_request */
type t_list_request = t_filter_params & t_page_params

/** Detection.t_list_response */
type t_list_response = t_page<Omit<t, "created_at"> & { created_at: string }>

/** Detection.t_export_request */
type t_export_request = {
  task: number
  label?: string
  score__gte?: number
  score__lte?: number
  score__gt?: number
  score__lt?: number
  filename?: string
}

/** Detection.t_export_response */
type t_export_response = Omit<File.t, "created_at" | "updated_at" | "meta"> & {
  created_at: string
  meta: {
    task_id: number
    label?: string | null
    score_min?: number | null
    score_max?: number | null
    detection_count?: number
  } | null
}

/** Detection.get: get detection details */
const get = async (client: Client.t, id: number): Promise<t> => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/detections/${id}/`,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  }
}

/** Detection.export: export detections to file */
const export_ = async (
  client: Client.t,
  params: t_export_request,
): Promise<File.t> => {
  const response = await client
    .get<t_export_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/detections/export-to-file/`,
      {
        params,
      },
    )
    .then(r => r.data)
  
  // Fetch the complete file object to ensure all fields are present
  const file = await File.get(client, response.id)
  
  // Return the file as-is since the backend has already set the meta correctly
  // The response meta structure is different from our expected format,
  // but the file object from File.get will have the correct meta structure
  return file
}

const list = async (
  client: Client.t,
  params?: t_list_request,
): Promise<t_page<t>> => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/detections/`,
      {
        params: {
          ...params,
          score__gte: params?.score_min,
          score__lte: params?.score_max,
          score_max: undefined,
          score_min: undefined,
        },
      },
    )
    .then(r => r.data)
  return {
    ...response,
    data: response.data.map(item => ({
      ...item,
      created_at: new Date(item.created_at),
    })),
  }
}

export {
  type t,
  type t_filter_params,
  type t_get_response,
  type t_list_request,
  type t_list_response,
  type t_export_request,
  type t_export_response,
  get,
  export_ as export,
  list,
}
