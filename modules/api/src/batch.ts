import * as K from "@maipl/constants"
import * as CSV from "@maipl/csv"
import * as F from "@maipl/format"
import * as Annotation from "./annotation"
import type * as Client from "./client"
import * as File from "./file"
import type * as Segment from "./segment"
import type { t_page, t_page_params } from "./types"
import type * as User from "./user"

/** Batch.t: batch details with pre-fetched segments and user */
type t = {
  /** Batch identifier */
  id: number
  /** Allow change of batch settings */
  allow_change_settings: boolean
  /** Annotation config file id */
  annotation_file: number
  /** Annotation config file, cached at time of last update */
  annotation_file_text: string
  /** Batch name */
  batch_name: string
  /** Date when batch was created */
  created_at: Date
  /** Batch description */
  description: string
  /** Batch list of input files */
  filelist: Array<number>
  /** Import file id, if used */
  import_file: null | number
  /** Batch owner, user object */
  owner: User.t
  /** Spectrogram parameters */
  parameters: t_parameters
  /** Batch progress */
  progress: number
  /** Segment parameters */
  segment_parameters: t_segment_parameters
  /** List of segment identifiers */
  segments: Array<number>
  /** Batch share */
  shared_to: [User.t, t_role][]
  /** Batch owner */
  user_id: number
  /** celery task, for processing */
  task_id: null | string
  /**
   * celery task status
   *
   * backend bug:
   * If task_id is set, task_status should never be null.
   * However the task_status is not immediately available after task creation and so it is possibly null.
   */
  task_status: null | t_celery_status
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

/** Batch.t_segment_parameters */
type t_segment_parameters = {
  length: number
  step?: number
  pad: boolean
}

/** Batch.t_celery_status */
enum t_celery_status {
  failure = "FAILURE",
  pending = "PENDING",
  retry = "RETRY",
  revoked = "REVOKED",
  started = "STARTED",
  success = "SUCCESS",
}

/**
 * Batch.t_role:
 *
 * The backend uses a unique numeric id for each role.
 *
 * The labels are cosmetic, for front-end use only
 */
enum t_role {
  unassigned = 0,
  viewer = 1,
  contributor = 2,
  collaborator = 3,
  owner = 4,
}

/** Batch.t_status */
enum t_status {
  empty = "EMPTY",
  error = "ERROR",
  processing = "PROCESSING",
  success = "SUCCESS",
  unprocessed = "UNPROCESSED",
}

/** Batch.t_list_item: a summarized batch, returned by Batch.list */
type t_list_item = Omit<t, "parameters">

/** Batch.t_create_request */
type t_create_request = {
  allow_change_settings: boolean
  annotation_file: number
  batch_name: string
  description: string
  filelist: Array<number>
  import_file: null | number
  parameters: t_parameters
  segment_parameters: t_segment_parameters
}

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

/** Batch.t_filter_shared */
enum t_filter_shared {
  all = "all",
  public = "true",
  private = "false",
}

/** Batch.t_list_request */
type t_list_request = t_page_params & t_filter_params

/** Batch.t_list_response */
type t_list_response = t_page<
  Omit<t_list_item, "created_at"> & { created_at: string }
>

/** Batch.t_process_response */
type t_process_response = {
  /** Celery task identifier */
  task_id: number
  /** Celery response message */
  message: string
}

/** Batch.t_read_segments_response */
type t_read_segments_response = Array<
  Omit<Segment.t, "start" | "end" | "created_at"> & {
    start: string
    end: string
    created_at: string
  }
>

/** Batch.t_share_change:
 *
 * A tuple of (user_id, role_id)
 *
 * ```ts
 * [5, 4] // assign user=5 to role=4
 * [3, 0] // unassign user=3
 * ```
 */
type t_share_change = [number, number]

/** Batch.t_update_request */
type t_update_request = Omit<t, "created_at" | "shared_to"> & {
  shared_to: t_share_change[]
}

/** Batch.audios: get list of batch audios */
const audios = async (
  client: Client.t,
  id: number,
): Promise<Array<Segment.t_audio>> => {
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
const create = async (client: Client.t, body: t_create_request): Promise<t> => {
  const response = await client
    .post<t_create_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/`,
      body,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  }
}

/** Batch.export: export an existing batch */
const export_ = async (client: Client.t, id: number): Promise<File.t> => {
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
    maipl_folder: File.t_maipl_folder.annotation,
    meta: {
      maipl: "annotations",
      batch: id,
    },
    path: filename,
    tag: "export",
  })
}

/** Batch.delete: delete an existing batch */
const delete_ = (client: Client.t, id: number): Promise<void> => {
  return client.delete(
    `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${id}/`,
  )
}

/** Batch.images: get list of batch images */
const images = (
  client: Client.t,
  id: number,
): Promise<Array<Segment.t_image>> => {
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
const list = async (
  client: Client.t,
  params: t_list_request,
): Promise<t_page<t_list_item>> => {
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
  }
}

/** Batch.get: get batch details */
const get = async (client: Client.t, id: number): Promise<t> => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${id}/`,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  }
}

type Patch<T extends { id: number }> = Pick<T, "id"> & Partial<Omit<T, "id">>

/** Batch.patch: partial update existing batch */
const patch = (
  client: Client.t,
  body: Patch<t_update_request>,
): Promise<void> => {
  return client.patch(
    `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${body.id}/`,
    body,
  )
}

/** Batch.process: submit a batch for processing */
const process = async (client: Client.t, id: number): Promise<number> => {
  const response = await client
    .post<t_process_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/process/`,
      {
        batch_id: id,
      },
    )
    .then(r => r.data)
  return response.task_id
}

/** Batch.segments: get unpaginated list of batch segments */
const segments = async (
  client: Client.t,
  id: number,
): Promise<Array<Segment.t>> => {
  const response = await client
    .get<t_read_segments_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${id}/segments/`,
    )
    .then(r => r.data)
  return response.map(s => ({
    ...s,
    created_at: new Date(s.created_at),
    end: Number(s.end),
    start: Number(s.start),
  }))
}

/** Batch.status: derivew batch status from celery task */
const status = (batch: t_list_item): t_status => {
  if (batch.segments.length == 0) return t_status.empty
  if (batch.task_id == null) return t_status.unprocessed
  switch (batch.task_status) {
    case null:
    case t_celery_status.started:
      return t_status.processing
    case t_celery_status.pending:
      return t_status.unprocessed
    case t_celery_status.failure:
    case t_celery_status.retry:
    case t_celery_status.revoked:
      return t_status.error
    case t_celery_status.success:
      return t_status.success
  }
}

/** Batch.update: update an existing batch */
const update = (client: Client.t, body: t_update_request): Promise<void> => {
  return client.put(
    `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/batch/${body.id}/`,
    body,
  )
}

export {
  type t,
  type t_create_request,
  type t_create_response,
  type t_filter_params,
  type t_get_response,
  type t_list_item,
  type t_list_request,
  type t_list_response,
  type t_parameters,
  type t_process_response,
  type t_segment_parameters,
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
  segments,
  status,
  t_filter_shared, // enum
  t_role, // enum
  t_status, // enum
  update,
}
