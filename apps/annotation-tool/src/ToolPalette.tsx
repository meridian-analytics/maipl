import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { useSpecviz } from "specviz-react/hooks"

export default function ToolPalette(props: M.StackProps) {
  const { command, toolState } = useSpecviz()
  return (
    <M.Stack {...props}>
      <MR.ActionButton
        children={<I.AddLocation />}
        className={toolState === "annotate" ? "active" : ""}
        onClick={_ => command.tool("annotate")}
        title="Annotate"
      />

      <MR.ActionButton
        children={<I.SelectAllOutlined />}
        className={toolState === "select" ? "active" : ""}
        onClick={_ => command.tool("select")}
        title="Select"
      />
      <MR.ActionButton
        children={<I.ZoomInOutlined />}
        className={toolState === "zoom" ? "active" : ""}
        onClick={_ => command.tool("zoom")}
        title="Zoom"
      />
      <MR.ActionButton
        children={<I.PanToolOutlined />}
        className={toolState === "pan" ? "active" : ""}
        onClick={_ => command.tool("pan")}
        title="Pan"
      />
    </M.Stack>
  )
}
