import axios from "axios"
import type * as A from "axios"

type t_config = {
  headers?: Record<string, string>
  onError?: t_error_handler
}

type t_error_handler = <T, R = A.AxiosResponse<T>>(
  error: A.AxiosError,
) => Promise<R>

/** Client.t */
class t {
  private readonly headers?: Record<string, string>
  private readonly onError?: t_error_handler
  constructor(defaults?: t_config) {
    this.headers = defaults?.headers
    this.onError = defaults?.onError
  }
  // main interface
  // https://axios-http.com/docs/req_config
  // https://axios-http.com/docs/res_schema
  // https://axios-http.com/docs/handling_errors
  // typeof axios["request"] = <T=any, R=A.AxiosResponse<T>, D=any>(config: A.AxiosRequestConfig): Promise<R>
  request = <T, R = A.AxiosResponse<T>>({
    headers,
    ...config
  }: A.AxiosRequestConfig): Promise<R> =>
    axios
      .request<T, R>({
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...this.headers,
          ...headers,
        },
        ...config,
      })
      .catch(this.onError<T, R>)
  // wrappers
  delete: (typeof axios)["delete"] = (url, config) =>
    this.request({ ...config, method: "DELETE", url })
  get: (typeof axios)["get"] = (url, config) =>
    this.request({ ...config, method: "GET", url })
  patch: (typeof axios)["patch"] = (url, data, config) =>
    this.request({ ...config, method: "PATCH", url, data })
  post: (typeof axios)["post"] = (url, data, config) =>
    this.request({ ...config, method: "POST", url, data })
  put: (typeof axios)["put"] = (url, data, config) =>
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

export { type t, type t_config, type t_error_handler, create, guest }
