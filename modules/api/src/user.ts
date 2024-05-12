import * as K from "@maipl/constants"
import type * as Client from "./client"

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

/** User.get: Get user details by identifier */
const get = async (client: Client.t, id: t_get_request): Promise<t> => {
  return client
    .get<t>(`${K.MAIPL_AUTH_BACKEND}/api/user/${id}/`)
    .then(r => r.data)
}

/** User.list: Get unpaginated list of all users */
const list = async (client: Client.t): Promise<Array<t>> => {
  return client
    .get<Array<t>>(`${K.MAIPL_AUTH_BACKEND}/api/user/`)
    .then(r => r.data)
}

export { type t, get, list }
