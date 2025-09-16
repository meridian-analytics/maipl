import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"
import type { ActionState } from "../types"

// Memoized action button component to prevent unnecessary re-renders
export const ActionButton = R.memo(
  ({
    state,
    onCancel,
    onRetry,
  }: {
    state: ActionState
    onCancel: () => void
    onRetry: () => void
  }) => {
    if (state === "uploading") {
      return (
        <M.Button
          size="small"
          color="error"
          onClick={onCancel}
          startIcon={<I.Cancel />}
        >
          Cancel
        </M.Button>
      )
    }

    if (state === "cancelling") {
      return (
        <M.Button
          size="small"
          disabled
          startIcon={<M.CircularProgress size={16} />}
        >
          Cancelling
        </M.Button>
      )
    }

    if (state === "error" || state === "cancelled") {
      return (
        <M.Button size="small" onClick={onRetry} startIcon={<I.Refresh />}>
          Retry
        </M.Button>
      )
    }

    return null
  },
  // Only re-render if the state changes
  (prev, next) => prev.state === next.state
) 