import * as K from "@maipl/constants"
import type * as Client from "./client"
import type { t_page, t_page_params } from "./types"

/** Annotation.t */
type t = {
  /** Annotation identifier */
  id: string
  /** Batch identifier this annotation belongs to */
  batch: number
  /** Date when annotation was created */
  created_at: Date
  /** Backing file identifier */
  file: number
  /** Selected region for the annotation */
  region: t_region
  /** Segment identifier this annotation belongs to */
  segment: number
  /** Annotator identifier */
  user_id: number // todo: inconsistent naming
}

/** Annotation.t_region */
interface t_region {
  id: string
  x: number
  y: number
  width: number
  height: number
  xunit: string
  yunit: string
  [key: string]: t_region_value
}

type t_region_value = boolean | number | string | string[]

/** Annotation.t_create_request */
type t_create_request = Omit<t, "id" | "created_at" | "user_id">

/** Annotation.t_create_response */
type t_create_response = Omit<t, "created_at"> & { created_at: string }

/** Annotation.t_filter_params */
type t_filter_params = {
  /** Batch identifier */
  batch?: number
  /** Batch identifier in list ... */
  batches?: Array<number>
  /** Annotation identifier */
  id?: Array<number>
  /** Annotation identifier in list ... */
  ids?: Array<number>
  /** File identifier */
  file?: number
  /** Segment identifier */
  segment?: number
  /** Owner identifier */
  user?: number
}

/** Annotation.t_list_request */
type t_list_request = t_page_params & t_filter_params

/** Annotation.t_list_response */
type t_list_response = t_page<Omit<t, "created_at"> & { created_at: string }>

/** Annotation.t_read_segment_response */
type t_read_segment_response = Array<
  Omit<t, "created_at"> & { created_at: string }
>

/** Annotation.t_update_segment_request */
type t_update_segment_request = Array<
  Omit<t, "batch" | "file" | "segment" | "user_id">
>

/** Annotation.t_update_segment_response */
type t_update_segment_response = Array<
  Omit<t, "created_at"> & { created_at: string }
>

/** Annotation.create: create a new batch */
const create = async (client: Client.t, body: t_create_request): Promise<t> => {
  const response = await client
    .post<t_create_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/annotation/`,
      body,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  }
}

/** Annotation.updateSegment */
const updateSegment = async (
  client: Client.t,
  batch: number,
  segment: number,
  body: t_update_segment_request,
): Promise<Array<t>> => {
  const response = await client
    .put<t_update_segment_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/annotation/batch/${batch}/segment/${segment}/`,
      body,
    )
    .then(r => r.data)
  return response.map(a => ({
    ...a,
    created_at: new Date(a.created_at),
  }))
}

/** Annotation.readSegment */
const readSegment = async (
  client: Client.t,
  batch: number,
  segment: number,
): Promise<Array<t>> => {
  const response = await client
    .get<t_read_segment_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/annotation/batch/${batch}/segment/${segment}/`,
    )
    .then(r => r.data)
  return response.map(a => ({
    ...a,
    created_at: new Date(a.created_at),
  }))
}

/** Annotation.delete: delete an existing batch */
const delete_ = (client: Client.t, id: string): Promise<void> => {
  return client.delete(
    `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/annotation/${id}/`,
  )
}

/** Annotation.list: get paginated list of segments */
const list = async (
  client: Client.t,
  params: t_list_request,
): Promise<t_page<t>> => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/annotation/`,
      {
        params: {
          ...params,
          id__in: params.ids?.join(","), // todo: backend remapremap
          batch__in: params.batches?.join(","), // todo: backend remap
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

export {
  type t,
  type t_region,
  type t_create_request,
  type t_create_response,
  type t_read_segment_response,
  type t_update_segment_request,
  type t_update_segment_response,
  create,
  delete_ as delete,
  list,
  readSegment,
  updateSegment,
}
