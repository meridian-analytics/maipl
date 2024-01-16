/// <reference types="vite/client" />

import { safeParseBoolean, safeParseString } from "@maipl/format"

export const MAIPL_ANNOTATION_BACKEND = safeParseString(
  import.meta.env.MAIPL_ANNOTATION_BACKEND,
  "http://localhost:8000",
)

export const MAIPL_ANNOTATION_FRONTEND = safeParseString(
  import.meta.env.MAIPL_ANNOTATION_FRONTEND,
  "http://localhost:3000",
)

export const MAIPL_AUTH_BACKEND = safeParseString(
  import.meta.env.MAIPL_AUTH_BACKEND,
  "http://localhost:8000",
)

export const MAIPL_AUTH_FRONTEND = safeParseString(
  import.meta.env.MAIPL_AUTH_FRONTEND,
  "http://localhost:3000",
)

export const MAIPL_FILE_BACKEND = safeParseString(
  import.meta.env.MAIPL_FILE_BACKEND,
  "http://localhost:8000",
)

export const MAIPL_FILE_FRONTEND = safeParseString(
  import.meta.env.MAIPL_FILE_FRONTEND,
  "http://localhost:3000",
)

export const MAIPL_METRICS_BACKEND = safeParseString(
  import.meta.env.MAIPL_METRICS_BACKEND,
  "http://localhost:8000",
)

export const MAIPL_METRICS_FRONTEND = safeParseString(
  import.meta.env.MAIPL_METRICS_FRONTEND,
  "http://localhost:3000",
)

export const MAIPL_MODEL_RUNNER_BACKEND = safeParseString(
  import.meta.env.MAIPL_MODEL_RUNNER_BACKEND,
  "http://localhost:8000",
)

export const MAIPL_MODEL_RUNNER_FRONTEND = safeParseString(
  import.meta.env.MAIPL_MODEL_RUNNER_FRONTEND,
  "http://localhost:3000",
)

export const MAIPL_REACT_QUERY_DEVTOOLS: boolean = safeParseBoolean(
  import.meta.env.MAIPL_REACT_QUERY_DEVTOOLS,
  false,
)
