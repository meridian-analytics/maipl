import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import { useDebounce } from "../hooks"

export default function Notifications() {
  const isFetching = RQ.useIsFetching() > 0
  const isMutating = RQ.useIsMutating() > 0
  const isOpen = useDebounce(isFetching || isMutating, 1000) // debounce to prevent flickering
  return (
    <M.Snackbar
      open={isOpen}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <M.Alert severity="info" children="Synchronizing with server..." />
    </M.Snackbar>
  )
}
