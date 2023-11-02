import * as K from "@maipl/constants"
import * as Client from "./client.ts"
import { t_page, t_page_params } from "./types.ts"

/** Segment.t */
type t = {
  /** Segment identifier */
  id: number
  /** Owner identifier */
  user_id: number
  /** Audio file. Null if not processed. */
  audio: null | string
  /** Batches that use this segment */
  batches: Array<number>
  /** Backing file identifier */
  file: number
  /** File name */
  filename: string
  /** Segment start time in seconds */
  start: number
  /** Segment end time in seconds */
  end: number
  /** Date when segment was created */
  created_at: Date
  /** Segment tag */
  tag: string
}

/** Segment.t_audio */
type t_audio = {
  /** Audio identifier */
  id: number
  /** Audio resource url */
  audio: string
  /** Date when audio was created */
  created_at: Date
  /** Segment identifier this audio belongs to */
  segment_id: number
  /** Batch identifier this audio belongs to */
  batch_id: number
  /** User identifier this audio belongs to */
  user_id: number
}

/** Segment.t_image */
type t_image = {
  /** Image identifier */
  id: number
  /** Image resource url */
  image: string
  /** Date when image was created */
  created_at: Date
  /** Segment identifier this image belongs to */
  segment_id: number
  /** Batch identifier this image belongs to */
  batch_id: number
  /** User identifier this image belongs to */
  user_id: number
}

/** Segment.t_create_request */
type t_create_request = Omit<
  t,
  "id" | "audio" | "batches" | "created_at" | "user_id"
>

/** Segment.t_create_response */
type t_create_response = Omit<t, "created_at"> & { created_at: string }

/** Segment.t_get_response */
type t_get_response = Omit<t, "created_at"> & { created_at: string }

/** Segment.t_filter_params */
type t_filter_params = {
  /** Segment identifier in list ... */
  ids?: Array<number>
  /** Segment filename comtains ... */
  filename?: string
  /** Segment tag contains ... */
  tag?: string
  /** Owner identifier */
  user?: number
}

/** Segment.t_list_request */
type t_list_request = t_page_params & t_filter_params

/** Segment.t_list_response */
type t_list_response = t_page<Omit<t, "created_at"> & { created_at: string }>

/** Segment.list: get paginated list of segments */
const list = async (client: Client.t, params: t_list_request) => {
  const response = await client
    .get<t_list_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/segment/`,
      {
        params: {
          ...params,
          filename__contains: params.filename, // todo: backend remap
          id__in: params.ids?.join(","), // todo: backend remap
          tag__contains: params.tag, // todo: backend remap
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
      end: Number(item.end), // todo: backend not returning number
      start: Number(item.start), // todo: backend not returning number
    })),
  } as t_page<t>
}

/** Segment.get: get batch details */
const get = async (client: Client.t, id: number) => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/segment/${id}/`,
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  } as t
}

/** Segment.create: create a new batch */
const create = async (client: Client.t, body: t_create_request) => {
  const time = (n: number) => Number(n.toFixed(3)) // todo: backend too strict
  const response = await client
    .post<t_create_response>(
      `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/segment/`,
      {
        ...body,
        start: time(body.start),
        end: time(body.end),
      },
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
  } as t
}

/** Segment.delete: delete an existing batch */
const delete_ = async (client: Client.t, id: number) => {
  await client.delete(
    `${K.MAIPL_ANNOTATION_BACKEND}/api/annotation/segment/${id}/`,
  )
}

export {
  type t,
  type t_audio,
  type t_image,
  type t_create_request,
  type t_create_response,
  type t_get_response,
  type t_filter_params,
  type t_list_request,
  type t_list_response,
  create,
  delete_ as delete,
  get,
  list,
}
