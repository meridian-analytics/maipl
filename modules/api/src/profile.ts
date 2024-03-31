import * as K from "@maipl/constants"
import type * as Client from "./client.ts"
import type * as User from "./user.ts"

/** Profile.t_update_request */
type t_update_request = Omit<User.t, "id">

/** Profile.get: get profile for current user */
const get = (client: Client.t): Promise<User.t> => {
  return client
    .get<User.t>(`${K.MAIPL_AUTH_BACKEND}/api/user/profile/`)
    .then(r => r.data)
}

/** Profile.update: update profile for current user */
const update = async (
  client: Client.t,
  body: t_update_request,
): Promise<User.t> => {
  return client
    .put<User.t>(`${K.MAIPL_AUTH_BACKEND}/api/user/profile/`, {
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
    })
    .then(r => r.data)
}

export { type t_update_request, get, update }
