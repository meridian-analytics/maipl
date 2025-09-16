import * as M from "@mui/material"
import * as R from "react"

// Component for displaying upload status chips
export function UploadStatus(props: { status: string }) {
  switch (props.status) {
    case "none":
      return <></>
    case "error":
      return <M.Chip color="error" label="Error" size="small" />
    case "timeout":
      return <M.Chip color="error" label="Timeout" size="small" />
    case "pending":
      return <M.Chip color="warning" label="Pending" size="small" />
    case "ok":
      return <M.Chip color="success" label="Ok" size="small" />
    case "cancelled":
      return <M.Chip color="default" label="Cancelled" size="small" />
    case "cancelling":
      return (
        <M.Chip
          color="default"
          label="Cancelling"
          size="small"
          icon={<M.CircularProgress size={16} />}
        />
      )
    case "duplicate":
      return <M.Chip color="warning" label="Already exists" size="small" />
    default:
      return <M.Chip label={props.status} color="info" size="small" />
  }
} 