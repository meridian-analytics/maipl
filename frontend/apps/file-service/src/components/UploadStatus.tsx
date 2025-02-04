import * as M from "@mui/material"
import * as R from "react"

// Component for displaying upload status chips
export function UploadStatus(props: { status: string }) {
  switch (props.status) {
    case "none":
      return <></>
    case "error":
      return <M.Chip color="error" label="Error" />
    case "timeout":
      return <M.Chip color="error" label="Timeout" />
    case "pending":
      return <M.Chip color="warning" label="Pending" />
    case "ok":
      return <M.Chip color="success" label="Ok" />
    case "cancelled":
      return <M.Chip color="default" label="Cancelled" />
    case "cancelling":
      return (
        <M.Chip
          color="default"
          label="Cancelling"
          icon={<M.CircularProgress size={16} />}
        />
      )
    case "duplicate":
      return <M.Chip color="warning" label="Already exists" />
    default:
      return <M.Chip label={props.status} color="info" />
  }
} 