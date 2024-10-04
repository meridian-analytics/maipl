import * as K from "@maipl/constants"
import type * as Client from "./client"

/** TrainerTask.t */
type t = {
  /** Trainer task identifier */
  id: number
  /** Name */
  name: string
  /** Description */
  description: string
  /** celery task id */
  celery_task_id: string
  /** dataset file id */
  dataset_file: number
  /** recipe file id */
  recipe_file: number
  /** model file id */
  model_file: number
  /** model training options object */
  options: Record<string, string>
  /** Date created */
  created_at: Date
  /** Date updated */
  updated_at: Date
  /** user id */
  user: number
  /** Task status */
  status:
    | "CREATED"
    | "PENDING"
    | "STARTED"
    | "FAILURE"
    | "RETRY"
    | "REVOKED"
    | "SUCCESS"
}

/** TrainerTask.t_get_response */
type t_get_response = Omit<t, "created_at" | "updated_at"> & {
  created_at: string
  updated_at: string
}

/** TrainerTask.t_create_request */
type t_create_request = Omit<
  t,
  "id" | "celery_task_id" | "created_at" | "updated_at" | "user"
>

/** TrainerTask.t_create_response */
type t_create_response = t_get_response

/** TrainerTask.t_filter_params */
type t_filter_params = {
  status?: string
  user_id?: number
}

/** TrainerTask.t_list_request */
type t_list_request = t_filter_params

/** TrainerTask.t_list_response */
type t_list_response = Array<t_get_response>

let tasks_db = [
  {
    id: 1,
    name: "Task 1",
    description: "Description 1",
    celery_task_id: "1234567890",
    dataset_file: 1,
    recipe_file: 1,
    model_file: 1,
    options: {},
    created_at: new Date(),
    updated_at: new Date(),
    user: 1,
    status: "CREATED",
  },
  {
    id: 2,
    name: "Task 2",
    description: "Description 2",
    celery_task_id: "1234567890",
    dataset_file: 1,
    recipe_file: 1,
    model_file: 1,
    options: {},
    created_at: new Date(),
    updated_at: new Date(),
    user: 1,
    status: "STARTED",
  },
]

/** TrainerTask.create: create a new trainer task */
const create = async (client: Client.t, body: t_create_request): Promise<t> => {
  /*   const response = await client
    .post<t_create_response>(
      `${K.MAIPL_MODEL_TRAINER_BACKEND}/api/ketos/train/tasks/`,
      body
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  } */

  const newTask = {
    ...body,
    id: tasks_db.length + 1,
    user: 1,
    created_at: new Date(),
    updated_at: new Date(),
  }
  tasks_db = [...tasks_db, newTask]
  return newTask
}

/** TrainerTask.delete: delete an existing trainer task */
const delete_ = (client: Client.t, id: number): Promise<void> => {
  return client.delete(
    `${K.MAIPL_MODEL_TRAINER_BACKEND}/api/ketos/train/tasks/${id}/`
  )
}

/** TrainerTask.get: get a trainer task by id */
const get = async (client: Client.t, id: number): Promise<t> => {
  const response = await client
    .get<t_get_response>(
      `${K.MAIPL_MODEL_TRAINER_BACKEND}/api/ketos/train/tasks/${id}/`
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

/** TrainerTask.list: get list of trainer tasks */
const list = async (
  client: Client.t,
  params?: t_list_request
): Promise<Array<t>> => {
  /*   const response = await client
    .get<t_list_response>(
      `${K.MAIPL_MODEL_TRAINER_BACKEND}/api/ketos/train/tasks/`,
      { params },
    )
    .then(r => r.data)
  return response.map(item => ({
    ...item,
    created_at: new Date(item.created_at),
    updated_at: new Date(item.updated_at),
  })) */
  return tasks_db
}

/** TrainerTask.start: start a trainer task; enqueue with task runner */
const start = async (client: Client.t, id: number): Promise<t> => {
  const response = await client
    .post<t_get_response>(
      `${K.MAIPL_MODEL_TRAINER_BACKEND}/api/ketos/train/tasks/${id}/`
    )
    .then((r) => r.data)
  return {
    ...response,
    created_at: new Date(response.created_at),
    updated_at: new Date(response.updated_at),
  }
}

export {
  type t,
  type t_create_request,
  type t_create_response,
  type t_filter_params,
  type t_get_response,
  type t_list_request,
  type t_list_response,
  create,
  delete_,
  get,
  list,
  start,
}
