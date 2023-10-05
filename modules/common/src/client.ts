import axios, * as A from "axios"

type t_config = {
  headers?: Record<string, string>
  onError?: (error: A.AxiosError) => any
}

/** Client.t */
class t {
  private readonly headers?: Record<string, string>
  private readonly onError?: (error: A.AxiosError) => any
  constructor(defaults?: t_config) {
    this.headers = defaults?.headers
    this.onError = defaults?.onError
  }
  // main interface
  // https://axios-http.com/docs/req_config
  // https://axios-http.com/docs/res_schema
  // https://axios-http.com/docs/handling_errors
  request: typeof axios["request"] = ({ headers, ...config }) =>
    axios
      .request({
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...this.headers,
          ...headers,
        },
        ...config,
      })
      .catch(this.onError)
  // wrappers
  delete: typeof axios["delete"] = (url, config) =>
    this.request({ ...config, method: "DELETE", url })
  get: typeof axios["get"] = (url, config) =>
    this.request({ ...config, method: "GET", url })
  patch: typeof axios["patch"] = (url, data, config) =>
    this.request({ ...config, method: "PATCH", url, data })
  post: typeof axios["post"] = (url, data, config) =>
    this.request({ ...config, method: "POST", url, data })
  put: typeof axios["put"] = (url, data, config) =>
    this.request({ ...config, method: "PUT", url, data })

  // introspection
  get isGuest() {
    return this === guest
  }
}

/** Client.create: create a new client */
const create = (config?: t_config) => {
  return new t(config)
}

/** Client.guest: a guest client */
const guest = create()

export { type t, create, guest }
