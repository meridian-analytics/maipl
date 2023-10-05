/** A type that can be null */
type t_nullable<T> = T | null

/** Types.tpage: a paginated list of items */
type t_page<T> = {
  /** List of items */
  data: Array<T>
  /** Current page number */
  page: number
  /** Number of items per page */
  size: number
  /** Total number of items */
  count: number
  /** Previous page */
  prev: t_nullable<number>
  /** Next page */
  next: t_nullable<number>
}

/** Types.tpageparams: query parameters for paginated requests */
type t_page_params = {
  /** Page number */
  page?: number
  /** Number of items per page */
  size?: number
}

export { type t_nullable, type t_page, type t_page_params }
