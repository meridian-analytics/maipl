import type { Batch } from "@maipl/api"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"

export const DEFAULT_ANNOTATION_CONFIG_VALUE = "__built_in_default__"
export const DEFAULT_ANNOTATION_CONFIG_NAME =
  "Default marine mammal annotation schema"

export function parseAnnotationConfig(
  value: string | null | undefined,
): Batch.t_annotation_config | undefined {
  if (value == null || value === "") return undefined
  try {
    return JSON.parse(value) as Batch.t_annotation_config
  } catch {
    return undefined
  }
}

export function DefaultAnnotationSchemaDetails(props: {
  details?: Batch.t_default_annotation_schema
  config?: Batch.t_annotation_config
  loading?: boolean
  onRetry?: () => void
}) {
  const [open, setOpen] = R.useState(false)
  const config = props.details?.config ?? props.config

  if (props.loading) {
    return (
      <M.Stack direction="row" spacing={1} alignItems="center" padding={1}>
        <M.CircularProgress size={16} />
        <M.Typography variant="caption">Loading schema details...</M.Typography>
      </M.Stack>
    )
  }

  if (config == null) {
    return (
      <M.Alert
        severity="warning"
        action={
          props.onRetry && (
            <M.Button color="inherit" size="small" onClick={props.onRetry}>
              Retry
            </M.Button>
          )
        }
      >
        Schema details are temporarily unavailable.
      </M.Alert>
    )
  }

  return (
    <>
      <M.Button
        onClick={() => setOpen(true)}
        size="small"
        startIcon={<I.InfoOutlined />}
      >
        View schema details
      </M.Button>
      <M.Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <M.DialogTitle>
          {props.details?.name ?? DEFAULT_ANNOTATION_CONFIG_NAME}
        </M.DialogTitle>
        <M.DialogContent>
          <M.Stack spacing={2}>
            <M.Typography>
              {props.details?.description ??
                "Classifies audio as Killer whale (KW), Humpback whale (HB), both species (KW+HB), or Background."}
            </M.Typography>
            <M.Typography variant="subtitle2">Schema JSON</M.Typography>
            <M.Paper
              component="pre"
              variant="outlined"
              sx={{
                margin: 0,
                padding: 2,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(config, null, 2)}
            </M.Paper>
          </M.Stack>
        </M.DialogContent>
        <M.DialogActions>
          <M.Button onClick={() => setOpen(false)}>Close</M.Button>
        </M.DialogActions>
      </M.Dialog>
    </>
  )
}
