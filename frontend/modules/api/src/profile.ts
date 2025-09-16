import * as K from "@maipl/constants"
import type * as Client from "./client"
import type * as User from "./user"

/** Profile.t_update_request */
type t_update_request = {
  first_name?: string
  last_name?: string
  password?: string
  current_password?: string
}

/** Profile.get: get profile for current user */
const get = (client: Client.t): Promise<User.t> => {
  return client
    .get<User.t>(`${K.MAIPL_AUTH_BACKEND}/api/user/profile/`)
    .then((r) => r.data)
}

/** Profile.update: update profile for current user */
const update = async (
  client: Client.t,
  body: t_update_request
): Promise<User.t> => {
  return client
    .patch<User.t>(`${K.MAIPL_AUTH_BACKEND}/api/user/profile/update/`, body)
    .then((r) => r.data)
}

export { type t_update_request, get, update }
