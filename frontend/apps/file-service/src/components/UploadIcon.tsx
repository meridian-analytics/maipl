import * as M from "@mui/material"
import * as R from "react"

// Component for displaying file type icons in the dropzone
export function UploadIcon(props: {
  icon: typeof M.SvgIcon
  label: string
  size?: number
}) {
  return (
    <M.Stack
      alignItems="center"
      justifyContent="center"
      sx={{
        height: props.size ?? 128,
        width: props.size ?? 128,
        backgroundColor: "#eee",
      }}
    >
      <props.icon sx={{ fontSize: (props.size ?? 128) / 2 }} />
      <M.Typography
        children={props.label}
        sx={{
          fontFamily: props.label.startsWith(".") ? "monospace" : "inherit",
        }}
      />
    </M.Stack>
  )
} 