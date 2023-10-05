import * as Client from "../client.ts"
import * as K from "../constants.ts"
import * as User from "./api.user.ts"

/** Profile.t_update_request */
type t_update_request = Omit<User.t, "id">

/** Profile.get: get profile for current user */
const get = async (client: Client.t) => {
  return client
    .get<User.t>(`${K.MAIPL_AUTH_BACKEND}/api/user/profile/`)
    .then(r => r.data)
}

/** Profile.update: update profile for current user */
const update = async (client: Client.t, body: t_update_request) => {
  await client
    .put(`${K.MAIPL_AUTH_BACKEND}/api/user/profile/`, {
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
    })
    .then(r => r.data)
}

export { get, update }
