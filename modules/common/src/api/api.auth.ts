import * as Client from "../client.ts"
import * as K from "../constants.ts"

/** Auth.taccess: an access token */
type t_access = {
  /** JWT access token */
  access: string
}

/** Auth.taccess: a refresh token */
type t_refresh = {
  /** JWT refresh token */
  refresh: string
}

/** Auth.t_code: an authorization code */
type t_code = {
  /** Authorization code */
  code: string
}

/** Auth.t_pair: a pair of access and refresh tokens */
type t_pair = t_access & t_refresh

/** Auth.t_login_request */
type t_login_request = {
  email: string
  password: string
  challenge: string
  next: string
}

/** Auth.t_tokens_request */
type t_tokens_request = {
  code: string
  verifier: string
}

/** Auth.login */
async function login(body: t_login_request) {
  return Client.guest
    .post<t_code>(`${K.MAIPL_AUTH_BACKEND}/api/auth/login/`, body)
    .then(r => r.data)
}

/** Auth.refresh: obtain new access token using refresh token */
async function refresh(refresh: string) {
  return Client.guest
    .post<t_access>(`${K.MAIPL_AUTH_BACKEND}/api/auth/token/refresh/`, {
      refresh,
    })
    .then(r => r.data)
}

/** Auth.tokens: exchange authorization code for token pair */
async function tokens(body: t_tokens_request) {
  return Client.guest
    .post<t_pair>(`${K.MAIPL_AUTH_BACKEND}/api/auth/token/`, body)
    .then(r => r.data)
}

export { type t_access, type t_refresh, type t_pair, login, refresh, tokens }
