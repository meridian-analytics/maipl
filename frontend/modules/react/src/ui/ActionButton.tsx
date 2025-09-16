import * as M from "@mui/material"
import type * as RR from "react-router-dom"

export default function ActionButton({
  title,
  ...props
}: M.IconButtonProps & {
  to?: RR.To // hack: when component={RR.Link} this should be inferred, but somehow it's not
}) {
  return props.disabled ? (
    <M.IconButton {...props} />
  ) : (
    <M.Tooltip title={title}>
      <M.IconButton {...props} />
    </M.Tooltip>
  )
}
