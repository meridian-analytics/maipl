import * as K from "@maipl/constants"
import * as CSV from "@maipl/csv"
import type * as Client from "./client"
import * as File from "./file"
import type { Require, t_page, t_page_params } from "./types"

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
type t_export_request = Require<t_filter_params, "task" | "model">

/** Detection.t_export_response */
type t_export_response = Array<t_get_response>

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

/** Detection.list: get list of detections */
const export_ = async (
  client: Client.t,
  params: t_export_request,
  filename?: string,
  tag?: string,
): Promise<File.t> => {
  const { data: detections } = await client.get<Array<t_get_response>>(
    `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/detections/export/`,
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
  const columns = {
    id: "detection",
    user_id: "user",
    task: "task",
    file: "file",
    file_path: "filename",
    start: "start",
    end: "end",
    label: "label",
    score: "score",
    created_at: "date",
  }
  const path = filename ?? `detections-${Date.now()}.csv`
  return File.create(client, {
    file: new window.File([CSV.encode(columns, detections)], path, {
      type: "text/csv",
    }),
    maipl_folder: File.t_maipl_folder.annotations,
    meta: {
      maipl: "detections",
      label: params?.label,
      model: params?.model,
      score_min: params?.score_min,
      score_max: params?.score_max,
      task: params?.task,
    },
    path,
    tag,
  })
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
