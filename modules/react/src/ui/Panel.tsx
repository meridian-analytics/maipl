import * as M from "@mui/material"
import * as R from "react"

export default function Panel(props: {
  title: string
  actions?: R.ReactNode
  contents: R.ReactNode
  footer?: R.ReactNode
  sx?: M.SxProps
}) {
  return (
    <M.Stack component={M.Paper} spacing={0} sx={props.sx}>
      <M.Stack
        direction="row"
        alignItems="center"
        sx={{ height: 48, padding: 2, flexShrink: 0 }}
      >
        <M.Typography variant="body2" children={props.title} />
        <M.Stack sx={{ flexGrow: 1 }} />
        <M.Stack direction="row-reverse">{props.actions}</M.Stack>
      </M.Stack>
      <M.Box sx={{ flexGrow: 1, overflow: "auto" }} children={props.contents} />
      {props.footer && <M.Box sx={{ flexShrink: 0 }}>{props.footer}</M.Box>}
    </M.Stack>
  )
}
