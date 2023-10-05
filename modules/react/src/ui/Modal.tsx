import * as M from "@mui/material"
import * as R from "react"

const style = {
  backgroundColor: M.colors.grey[50],
  boxShadow: 24,
  maxHeight: "95vh",
  maxWidth: "960px",
  overflow: "hidden",
  padding: 2,
}

export default function Modal(props: {
  children: R.ReactNode
  onClose: () => void
  sx?: M.SxProps
}) {
  return (
    <M.Modal open={true} onClose={props.onClose}>
      <M.Stack
        alignItems="center"
        justifyContent="center"
        sx={{ height: "100%", maxHeight: "100%", overflow: "hidden" }}
      >
        <M.Box children={props.children} sx={{ ...style, ...props.sx }} />
      </M.Stack>
    </M.Modal>
  )
}
