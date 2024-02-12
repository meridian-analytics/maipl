import { hexDigest, sha256 } from "@maipl/buffer"
import * as K from "@maipl/constants"
import * as JS from "@maipl/js"
import * as A from "axios"
import * as Client from "./client.ts"
import * as Meta from "./meta.ts"
import { t_page, t_page_params } from "./types.ts"

export function invariantMaiplFolder(
  folder: string,
): asserts folder is t_maipl_folder {
  JS.invariant(
    folder in t_maipl_folder,
    `"${folder}" is not a valid maipl folder`,
  )
}

/** File.t_maipl_folder */
enum t_maipl_folder {
  annotation = "annotation",
  config = "config",
  dataset = "dataset",
  model = "model",
  raw = "raw",
}

/** File.t represents files that have already been uploaded */
type t = {
  /** File identifier */
  id: number
  /** The file name */
  basename: string
  /** Date when the file was created */
  created_at: Date
  /** The file directory */
  dirname: string
  /** The file's extension, including the dot */
  extname: string
  /** The minio uri */
  file: string
  /** MAIPL folder */
  maipl_folder: t_maipl_folder
  /** File metadata */
  meta: Meta.t_meta | null
  /** The complete file path, including name */
  path: string
  /** Sha256 integrity checksum */
  sha256: string
  /** File size in bytes */
  size: number
  /** File tag */
  tag: string
  /** Date when the file was last updated */
  updated_at: Date
  /** Owner identifier */
  user_id: number
}

/** File.t_usage */
type t_usage = {
  /** Annotation usage in bytes */
  annotation: number
  /** Configuration usage in bytes */
  config: number
  /** Dataset usage in bytes */
  dataset: number
  /** Model usage in bytes */
  model: number
  /** Public file usage in bytes */
  public: number
  /** Private file usage in bytes */
  private: number
  /** Raw usage in bytes */
  raw: number
}

/** File._filter_params used to filter results from File.list */
type t_filter_params = {
  /** File identifier in list ... */
  ids?: Array<number>
  /** File exists in MAIPL folder ... */
  maipl_folder?: t_maipl_folder
  /** File path contains ... */
  path?: string
  /** File tag contains ... */
  tag?: string
  /** File owner identifier */
  owner?: number
}

/** File.t_create_request */
type t_create_request = {
  /** File to upload */
  file: File
  /** MAIPL folder */
  maipl_folder: t_maipl_folder
  /** File metadata */
  meta: Meta.t_meta | null
  /** Complete file path, including file name */
  path: string
  /** File tag */
  tag?: string
}

/** File.t_create_response */
type t_create_response = Omit<t, "created_at" | "updated_at" | "meta"> & {
  created_at: string
  updated_at: string
  meta: string
}

/** File.t_delete_request */
type t_delete_request = Array<number>

/** File.t_get_request */
type t_get_request = number

/** File.t_get_response */
type t_get_response = Omit<t, "created_at" | "updated_at" | "meta"> & {
  created_at: string
  updated_at: string
  meta: string
}

/** File.t_list_request */
type t_list_request = t_page_params & t_filter_params

/** File.t_list_response */
type t_list_response = t_page<
  Omit<t, "created_at" | "updated_at" | "meta"> & {
    created_at: string
    updated_at: string
    meta: string
  }
>

/** File.t_update_request */
type t_update_request = t_create_request

/** File.t_update_response */
type t_update_response = t

/** File.create: upload a new file */
const create = async (
  client: Client.t,
  body: t_create_request,
  onUploadProgress?: A.AxiosRequestConfig["onUploadProgress"],
): Promise<t> => {
  const checksum = hexDigest(await sha256(await body.file.arrayBuffer()))
  const formData = new FormData()
  formData.append("file", new Blob([body.file], { type: body.file.type }))
  formData.append("maipl_folder", body.maipl_folder)
  formData.append("meta", JSON.stringify(body.meta))
  formData.append("path", body.path)
  formData.append("sha256", checksum)
  formData.append("tag", body.tag ?? "")
  const response = await client
    .post<t_create_response>(`${K.MAIPL_FILE_BACKEND}/api/file/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    })
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
    meta: Meta.safeParse(response.meta),
  }
}

/** File.delete: delete files by ids */
const delete_ = (client: Client.t, ids: t_delete_request): Promise<void> => {
  return client.delete(`${K.MAIPL_FILE_BACKEND}/api/file/`, {
    params: {
      ids: ids.join(","),
    },
  })
}

/** File.list: get paginated list of files */
const list = async (
  client: Client.t,
  params: t_list_request,
): Promise<t_page<t>> => {
  const response = await client
    .get<t_list_response>(`${K.MAIPL_FILE_BACKEND}/api/file/`, {
      params: {
        ...params,
        ids: params?.ids?.join(","),
      },
    })
    .then(r => r.data)
  return {
    ...response,
    data: response.data.map(file => ({
      ...file,
      created_at: new Date(file.created_at),
      updated_at: new Date(file.updated_at),
      meta: Meta.safeParse(file.meta),
    })),
  }
}

/** File.get: get file by id */
const get = async (client: Client.t, id: t_get_request): Promise<t> => {
  const response = await client
    .get<t_get_response>(`${K.MAIPL_FILE_BACKEND}/api/file/${id}/`)
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
    meta: Meta.safeParse(response.meta),
  }
}

/** File.discoverMeta: attempt automatic discovery of metadata from a system file */
async function discoverMeta(file: File): Promise<Meta.t_meta | null> {
  return Meta.discover(await read(file))
}

/** File.safeMeta: safely read metadata from a file */
function safeMeta<
  K extends Meta.t_meta["maipl"],
  U extends Extract<Meta.t_meta, { maipl: K }>,
  F extends keyof U,
  R,
>(file: t, kind: K, field: F, orElse: R): U[F] | R {
  return file.meta == null
    ? orElse
    : Meta.safeRead(file.meta, kind, field, orElse)
}

function read(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", function () {
      resolve(this.result as ArrayBuffer)
    })
    reader.addEventListener("error", function () {
      reject(this.error)
    })
    reader.readAsArrayBuffer(file)
  })
}

/** File.update: update existing file */
const update = async (
  client: Client.t,
  id: number,
  body: t_update_request,
  onUploadProgress?: A.AxiosRequestConfig["onUploadProgress"],
): Promise<t> => {
  const checksum = hexDigest(await sha256(await body.file.arrayBuffer()))
  const formData = new FormData()
  formData.append("file", new Blob([body.file], { type: body.file.type }))
  formData.append("maipl_folder", body.maipl_folder)
  formData.append("meta", JSON.stringify(body.meta))
  formData.append("path", body.path)
  formData.append("sha256", checksum)
  formData.append("tag", body.tag ?? "")
  const response = await client
    .put<t_create_response>(
      `${K.MAIPL_FILE_BACKEND}/api/file/${id}/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      },
    )
    .then(r => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
    meta: Meta.safeParse(response.meta),
  }
}

/** File.usage: get usage report */
const usage = (client: Client.t): Promise<t_usage> => {
  return client
    .get<t_usage>(`${K.MAIPL_FILE_BACKEND}/api/file/usage/`)
    .then(r => r.data)
}

export {
  type t,
  type t_create_request,
  type t_create_response,
  type t_delete_request,
  type t_get_request,
  type t_get_response,
  type t_list_request,
  type t_list_response,
  t_maipl_folder, // enum
  type t_update_request,
  type t_update_response,
  type t_usage,
  create,
  delete_ as delete,
  discoverMeta,
  get,
  list,
  safeMeta,
  update,
  usage,
}

export { type t_meta } from "./meta.ts"
