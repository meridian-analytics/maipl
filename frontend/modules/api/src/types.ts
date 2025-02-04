/** Types.Require: derive new type that converts optional fields to required fields */
export type Require<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/** Types.tpage: a paginated list of items */
export type t_page<T> = {
  /** List of items */
  data: Array<T>
  /** Current page number */
  page: number
  /** Number of items per page */
  size: number
  /** Total number of items */
  count: number
  /** Previous page */
  prev: null | number
  /** Next page */
  next: null | number
}

/** Types.tpageparams: query parameters for paginated requests */
export type t_page_params = {
  /** Page number */
  page?: number
  /** Number of items per page */
  size?: number
}
