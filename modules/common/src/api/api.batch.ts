import * as Client from "../client.ts"
import * as K from "../constants.ts"
import * as CSV from "../csv.ts"
import * as F from "../format.ts"
import { t_page, t_page_params } from "../types.ts"
import * as Annotation from "./api.annotation.ts"
import * as File from "./api.file.ts"
import * as Segment from "./api.segment.ts"
import * as Task from "./api.task.ts"
import * as User from "./api.user.ts"

/** Batch.t: batch details with pre-fetched segments and user */
type t = {
  /** Batch identifier */
  id: number
  /** Allow change of batch settings */
  allow_change_settings: boolean
  /** Batch name */
  batch_name: string
  /** Date when batch was created */
  created_at: Date
  /** Batch description */
  description: string
  /** Valid form schema for annotation */
  form: string
  /** Batch parameters */
  parameters: t_parameters
  /** Batch progress */
  progress: number
  /** List of segment identifiers */
  segments: Array<number>
  /** Batch owner */
  user: User.t
}

/** Batch.t_parameters */
type t_parameters = {
  /** Amplification: todo: describe */
  amplification: number
  /** Channel zero-based number */
  channel: number
  /** Color map for spectrogram */
  color_map: string // todo: enumarate possible values
  /** Maximum frequency in Hz */
  freq_max: number
  /** Minimum frequency in Hz */
  freq_min: number
  /** Low pass filter in Hz */
  low_pass: number
  /** High pass filter in Hz */
  high_pass: number
  /** Sampling rate */
  rate: number
  /** Window step size in seconds */
  step_size: number
  /** Type: todo: describe */
  type: string // todo: enumerate possible values
  /** Vmax: todo: describe */
  vmax: number
  /** Vmin: todo: describe */
  vmin: number
  /** Window length in seconds */
  window_length: number
}

/** Batch.t_list_item: a summarized batch, returned by Batch.list */
type t_list_item = Omit<t, "parameters" | "user"> & {
  /** Batch owner id */
  user: number
}

/** Batch.t_create_request */
type t_create_request = Omit<t, "id" | "created_at" | "progress" | "user">

/** Batch.t_create_response */
type t_create_response = Omit<t, "created_at"> & { created_at: string }

/** Batch.t_get_response */
type t_get_response = Omit<t, "created_at"> & { created_at: string }

/** Batch.t_filter_params */
type t_filter_params = {
  /** Batch name comtains ... */
  name?: string
  /** Owner identifier */
  user?: number
}

/** Batch.t_list_request */
type t_list_request = t_page_params & t_filter_params

/** Batch.t_list_response */
type t_list_response = t_page<
  Omit<t_list_item, "created_at"> & { created_at: string }
>

/** Batch.t_update_request
 * form is not editable at this time
 */
type t_update_request = Omit<t, "created_at" | "form" | "user"> & {
  user: number
}

/** Batch.audios: get list of batch audios */
const audios = async (client: Client.t, id: number) => {
  return client
    .get<Array<Segment.t_audio>>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/audio/`,
      {
        params: {
          batch_id: id,
        },
      },
    )
    .then(r => r.data)
}

/** Batch.create: create a new batch */
const create = async (client: Client.t, body: t_create_request) => {
  const response = await client
    .post<t_create_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/`,
      body,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  } as t
}

/** Batch.export: export an existing batch */
const export_ = async (client: Client.t, id: number) => {
  const { data: annotations } = await Annotation.list(client, {
    batch: id,
    size: 100, // todo: limited to 100. backend task?
  })
  const columns = {
    id: "Id",
    batch: "Batch",
    segment: "Segment",
    file: "File",
    user_id: "Owner",
    created_at: "Date",
    ...Object.fromEntries(
      annotations.flatMap(a => Object.keys(a.region)).map(k => [k, k]),
    ),
  }
  const filename = `batch-${id}-${Date.now()}.csv`
  return File.create(client, {
    file: new window.File(
      [
        CSV.encode(
          columns,
          annotations.map(a => ({
            ...a.region,
            ...a,
            created_at: F.iso8601(a.created_at),
          })),
        ),
      ],
      filename,
      { type: "text/csv" },
    ),
    maipl_folder: "annotation",
    meta: {},
    path: filename,
    tag: "export",
  })
}

/** Batch.delete: delete an existing batch */
const delete_ = async (client: Client.t, id: number) => {
  await client.delete(
    `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${id}/`,
  )
}

/** Batch.images: get list of batch images */
const images = async (client: Client.t, id: number) => {
  return client
    .get<Array<Segment.t_image>>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/image/`,
      {
        params: {
          batch_id: id,
        },
      },
    )
    .then(r => r.data)
}

/** Batch.list: get paginated list of batches */
const list = async (client: Client.t, params: t_list_request) => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/`,
      {
        params: {
          ...params,
          batch_name__contains: params.name, // todo: backend remap
          user_id: params.user, // todo: backend remap
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
  } as t_page<t_list_item>
}

/** Batch.get: get batch details */
const get = async (client: Client.t, id: number) => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${id}/`,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  } as t
}

type Patch<T extends { id: number }> = Pick<T, "id"> & Partial<Omit<T, "id">>

/** Batch.patch: partial update existing batch */
const patch = async (client: Client.t, body: Patch<t_update_request>) => {
  await client.patch(
    `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${body.id}/`,
    body,
  )
}

/** Batch.process: submit a batch for processing */
const process = async (client: Client.t, id: number): Promise<number> => {
  const response = await client
    .post<Task.t>(`${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/process/`, {
      batch_id: id,
    })
    .then(r => r.data)
  return response.id
}

/** Batch.update: update an existing batch */
const update = async (client: Client.t, body: t_update_request) => {
  await client.put(
    `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${body.id}/`,
    body,
  )
}

export {
  type t,
  type t_list_item,
  type t_parameters,
  type t_create_request,
  type t_create_response,
  type t_get_response,
  type t_filter_params,
  type t_list_request,
  type t_list_response,
  type t_update_request,
  audios,
  create,
  delete_ as delete,
  export_ as export,
  get,
  images,
  list,
  patch,
  process,
  update,
}
