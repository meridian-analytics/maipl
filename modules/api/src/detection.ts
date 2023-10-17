import * as K from "@maipl/constants"
import * as Client from "./client.ts"

/** Detection.t */
type t = {
  created_at: Date
  end: number
  file: number
  id: number
  label: string
  score: number
  start: number
  task: number
  updated_at: Date
  user_id: number
}

/** Detection.t_get_response */
type t_get_response = Omit<t, "created_at" | "updated_at"> & {
  created_at: string
  updated_at: string
}

// /** Detection.t_create_request */
// type t_create_request = Omit<
//   t,
//   | "id"
//   | "created_at"
//   | "updated_at"
// >

// /** Detection.t_create_response */
// type t_create_response = t_get_response

/** Detection.t_filter_params */
type t_filter_params = {
  file?: number
  label?: string
  task?: number
  score_max?: number
  score_min?: number
  user_id?: number
}

/** Detection.t_list_request */
type t_list_request = t_filter_params

/** Detection.t_list_response */
type t_list_response = Array<t_get_response>

// /** Detection.create: create a new detection */
// const create = async (client: Client.t, body: t_create_request) => {
//   const response = await client
//     .post<t_create_response>(
//       `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/detections/`,
//       body,
//     )
//     .then(r => r.data)
//   return {
//     ...response,
//     created_at: new Date(response.created_at),
//     updated_at: new Date(response.updated_at),
//   } as t
// }

/** Detection.get: get detection details */
const get = async (client: Client.t, id: number) => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/detections/${id}/`,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  } as t
}

/** Detection.list: get list of detections */
const list = async (client: Client.t, params?: t_list_request) => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_MODEL_RUNNER_BACKEND}/api/ketos/run/detections/`,
      { params },
    )
    .then(r => r.data)
  return response.map(item => ({
    ...item,
    created_at: new Date(item.created_at),
    updated_at: new Date(item.updated_at),
  })) as Array<t>
}

export {
  type t,
  // type t_create_request,
  // type t_create_response,
  type t_filter_params,
  type t_get_response,
  type t_list_request,
  type t_list_response,
  // create,
  get,
  list,
}
