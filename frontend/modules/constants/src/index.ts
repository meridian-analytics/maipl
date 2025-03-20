import { safeParseBoolean, safeParseString } from "@maipl/format"

export const MAIPL_ANNOTATION_BACKEND = safeParseString(
  import.meta.env["MAIPL_ANNOTATION_BACKEND"],
  "http://localhost:8000"
)

export const MAIPL_ANNOTATION_FRONTEND = safeParseString(
  import.meta.env["MAIPL_ANNOTATION_FRONTEND"],
  "http://localhost:3000"
)

export const MAIPL_AUTH_BACKEND = safeParseString(
  import.meta.env["MAIPL_AUTH_BACKEND"],
  "http://localhost:8000"
)

export const MAIPL_AUTH_FRONTEND = safeParseString(
  import.meta.env["MAIPL_AUTH_FRONTEND"],
  "http://localhost:3000"
)

export const MAIPL_FILE_BACKEND = safeParseString(
  import.meta.env["MAIPL_FILE_BACKEND"],
  "http://localhost:8000"
)

export const MAIPL_FILE_FRONTEND = safeParseString(
  import.meta.env["MAIPL_FILE_FRONTEND"],
  "http://localhost:3000"
)

export const MAIPL_METRICS_BACKEND = safeParseString(
  import.meta.env["MAIPL_METRICS_BACKEND"],
  "http://localhost:8000"
)

export const MAIPL_METRICS_FRONTEND = safeParseString(
  import.meta.env["MAIPL_METRICS_FRONTEND"],
  "http://localhost:3000"
)

export const MAIPL_MODEL_RUNNER_BACKEND = safeParseString(
  import.meta.env["MAIPL_MODEL_RUNNER_BACKEND"],
  "http://localhost:8000"
)

export const MAIPL_MODEL_RUNNER_FRONTEND = safeParseString(
  import.meta.env["MAIPL_MODEL_RUNNER_FRONTEND"],
  "http://localhost:3000"
)

export const MAIPL_MODEL_TRAINER_BACKEND = safeParseString(
  import.meta.env["MAIPL_MODEL_TRAINER_BACKEND"],
  "http://localhost:8000"
)

export const MAIPL_MODEL_TRAINER_FRONTEND = safeParseString(
  import.meta.env["MAIPL_MODEL_TRAINER_FRONTEND"],
  "http://localhost:3000"
)

export const MAIPL_REACT_QUERY_DEVTOOLS: boolean = safeParseBoolean(
  import.meta.env["MAIPL_REACT_QUERY_DEVTOOLS"],
  false
)

export const MAIPL_DOCUMENTATION_URL: string = safeParseString(
  import.meta.env["MAIPL_DOCUMENTATION_URL"],
  "https://docs.maipl-dev.com"
)

export const DEMO_USER_EMAIL: string = safeParseString(
  import.meta.env["DEMO_USER_EMAIL"]
)

export const DEMO_USER_PASSWORD: string = safeParseString(
  import.meta.env["DEMO_USER_PASSWORD"]
)
