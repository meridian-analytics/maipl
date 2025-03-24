import { safeParseBoolean, safeParseString } from "@maipl/format"

export const MAIPL_ANNOTATION_BACKEND = safeParseString(
  import.meta.env["MAIPL_ANNOTATION_BACKEND"]
)

export const MAIPL_ANNOTATION_FRONTEND = safeParseString(
  import.meta.env["MAIPL_ANNOTATION_FRONTEND"]
)

export const MAIPL_AUTH_BACKEND = safeParseString(
  import.meta.env["MAIPL_AUTH_BACKEND"]
)

export const MAIPL_AUTH_FRONTEND = safeParseString(
  import.meta.env["MAIPL_AUTH_FRONTEND"]
)

export const MAIPL_FILE_BACKEND = safeParseString(
  import.meta.env["MAIPL_FILE_BACKEND"]
)

export const MAIPL_FILE_FRONTEND = safeParseString(
  import.meta.env["MAIPL_FILE_FRONTEND"]
)

export const MAIPL_METRICS_BACKEND = safeParseString(
  import.meta.env["MAIPL_METRICS_BACKEND"]
)

export const MAIPL_METRICS_FRONTEND = safeParseString(
  import.meta.env["MAIPL_METRICS_FRONTEND"]
)

export const MAIPL_MODEL_RUNNER_BACKEND = safeParseString(
  import.meta.env["MAIPL_MODEL_RUNNER_BACKEND"]
)

export const MAIPL_MODEL_RUNNER_FRONTEND = safeParseString(
  import.meta.env["MAIPL_MODEL_RUNNER_FRONTEND"]
)

export const MAIPL_MODEL_TRAINER_BACKEND = safeParseString(
  import.meta.env["MAIPL_MODEL_TRAINER_BACKEND"]
)

export const MAIPL_MODEL_TRAINER_FRONTEND = safeParseString(
  import.meta.env["MAIPL_MODEL_TRAINER_FRONTEND"]
)

export const MAIPL_DATABASE_BACKEND = safeParseString(
  import.meta.env["MAIPL_DATABASE_BACKEND"]
)

export const MAIPL_DATABASE_FRONTEND = safeParseString(
  import.meta.env["MAIPL_DATABASE_FRONTEND"]
)

export const MAIPL_REACT_QUERY_DEVTOOLS: boolean = safeParseBoolean(
  import.meta.env["MAIPL_REACT_QUERY_DEVTOOLS"],
  false
)

export const MAIPL_DOCUMENTATION_URL: string = safeParseString(
  import.meta.env["MAIPL_DOCUMENTATION_URL"]
)

export const DEMO_USER_EMAIL: string = safeParseString(
  import.meta.env["DEMO_USER_EMAIL"]
)

export const DEMO_USER_PASSWORD: string = safeParseString(
  import.meta.env["DEMO_USER_PASSWORD"]
)
