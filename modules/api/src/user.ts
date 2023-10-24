import { t_page, t_page_params } from "@maipl/api"
import * as K from "@maipl/constants"
import * as Client from "./client.ts"

/** User.t */
type t = {
  /** User identifier */
  id: number
  /** User email */
  email: string
  /** User first name */
  first_name: string
  /** User last name */
  last_name: string
}

/** User.t_get_request */
type t_get_request = number

/** User.t_list_request */
type t_list_request = t_page_params

/** User.get: Get user details by identifier */
const get = async (client: Client.t, id: t_get_request) => {
  return client
    .get<t>(`${K.MAIPL_AUTH_BACKEND}/api/user/${id}/`)
    .then(r => r.data)
}

/** User.list: Get paginated list of all users */
const list = async (client: Client.t, params: t_list_request) => {
  return client
    .get<t_page<t>>(`${K.MAIPL_AUTH_BACKEND}/api/user/`, { params })
    .then(r => r.data)
}

export { type t, get, list }
