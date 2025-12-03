import { hexDigest, sha256 } from "@maipl/buffer"
import * as K from "@maipl/constants"
import type * as A from "axios"
import type * as Client from "./client"
import * as Meta from "./meta"
import type { t_page, t_page_params } from "./types"
import type * as User from "./user"

/** File.t_maipl_folder */
enum t_maipl_folder {
  annotations = "annotations",
  annotation_schemas = "annotation schemas",
  h5_databases = ".h5 databases",
  models = "models",
  audio_files = "audio files",
  metrics = "metrics",
  model_recipes = "model recipes",
  audio_configs = "audio configs"
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
  /** File owner, user object */
  owner: User.t
  /** Sha256 integrity checksum */
  sha256: string
  /** File share */
  shared_to: User.t[]
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
  annotations: number
  /** Configuration usage in bytes */
  annotation_schemas: number
  /** Dataset usage in bytes */
  h5_databases: number
  /** Model usage in bytes */
  models: number
  /** Public file usage in bytes */
  public: number
  /** Private file usage in bytes */
  private: number
  /** Raw usage in bytes */
  audio_files: number
  /** Audio configs usage in bytes */
  audio_configs: number
}

/** File._filter_params used to filter results from File.list */
type t_filter_params = {
  /** File identifier in list ... */
  ids?: Array<number>
  /** File exists in MAIPL folder ... */
  maipl_folder?: t_maipl_folder
  /** File path contains ... */
  path?: string
  /** File share status */
  shared?: t_filter_shared
  /** File tag contains ... */
  tag?: string
  /** File owner identifier */
  owner?: number
}

/** File.t_filter_shared */
enum t_filter_shared {
  all = "all",
  public = "true",
  private = "false",
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

/** File.t_patch_request */
type t_patch_request = Partial<{
  tag: string;
  path: string;
  maipl_folder: t_maipl_folder;
  meta: Meta.t_meta | null;
}>;

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

/** File.t_file_share */
type t_file_share = {
  file: number
  changes: t_file_share_change[]
}

/** File.t_file_share_change
 *
 * A (user_id, add/remove) tuple
 *
 * ```ts
 * [5, true] // share file with user 5
 * [6, false] // unshare file with user 6
 * ```
 */
type t_file_share_change = [number, boolean]

/** File.t_share_request: update shares */
type t_share_request = Array<t_file_share>

/** File.t_update_request */
type t_update_request = t_create_request

/** File.t_update_response */
type t_update_response = t

/** File.t_folder: Folder object */
type t_folder = {
  /** Folder name */
  name: string
  /** Full folder path */
  path: string
  /** Number of files in this folder (including subfolders) */
  file_count: number
}

/** File.t_folder_list_request: Request params for folder listing */
type t_folder_list_request = {
  /** Path prefix to list (e.g., "folder1/subfolder") */
  path_prefix?: string
  /** MAIPL folder */
  maipl_folder?: t_maipl_folder
  /** File tag filter */
  tag?: string
  /** Shared status filter */
  shared?: t_filter_shared
  /** Page number */
  page?: number
  /** Page size */
  size?: number
}

/** File.t_folder_list_response: Response from folder listing */
type t_folder_list_response = {
  /** List of direct subfolders */
  folders: Array<{
    name: string
    path: string
    file_count: number
  }>
  /** Paginated files directly in this folder */
  files: t_page<
    Omit<t, "created_at" | "updated_at" | "meta"> & {
      created_at: string
      updated_at: string
      meta: string
    }
  >
}

/** File.create: upload a new file */
const create = async (
  client: Client.t,
  body: t_create_request,
  onUploadProgress?: A.AxiosRequestConfig["onUploadProgress"],
  signal?: AbortSignal,
  config?: A.AxiosRequestConfig,
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
      signal,
      ...config,
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

/** File.listFolder: get folder contents (subfolders and files) */
const listFolder = async (
  client: Client.t,
  params: t_folder_list_request,
): Promise<t_folder_list_response> => {
  const response = await client
    .get<t_folder_list_response>(`${K.MAIPL_FILE_BACKEND}/api/file/folder/`, {
      params: {
        path_prefix: params.path_prefix ?? "",
        maipl_folder: params.maipl_folder,
        tag: params.tag,
        shared: params.shared,
        page: params.page,
        size: params.size,
      },
    })
    .then(r => r.data)
  return {
    ...response,
    files: {
      ...response.files,
      data: response.files.data.map(file => ({
        ...file,
        created_at: new Date(file.created_at),
        updated_at: new Date(file.updated_at),
        meta: Meta.safeParse(file.meta),
      })),
    },
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

function share(client: Client.t, body: t_share_request): Promise<void> {
  return client.post(`${K.MAIPL_FILE_BACKEND}/api/file/share/`, body)
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

/** File.patch: update specific fields of an existing file */
const patch = async (
  client: Client.t,
  id: number,
  body: t_patch_request
): Promise<t> => {
  const response = await client
    .patch<t_get_response>(
      `${K.MAIPL_FILE_BACKEND}/api/file/${id}/`,
      body,
      {
        headers: { "Content-Type": "application/json" },
      }
    )
    .then(r => r.data);

  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
    meta: Meta.safeParse(response.meta),
  };
};

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
  type t_filter_params,
  t_filter_shared, // enum
  type t_file_share,
  type t_file_share_change,
  type t_folder,
  type t_folder_list_request,
  type t_folder_list_response,
  type t_get_request,
  type t_get_response,
  type t_list_request,
  type t_list_response,
  t_maipl_folder, // enum
  type t_share_request,
  type t_update_request,
  type t_update_response,
  type t_usage,
  type t_patch_request,
  create,
  delete_ as delete,
  discoverMeta,
  get,
  list,
  listFolder,
  share,
  safeMeta,
  update,
  usage,
  patch,
}

export { type t_meta } from "./meta.ts"
