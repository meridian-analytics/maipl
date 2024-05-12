import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as Specviz from "specviz-react"

export default function ToolPalette(props: M.StackProps) {
  const input = Specviz.useInput()
  return (
    <M.Stack {...props}>
      <MR.ActionButton
        children={<I.AddLocation />}
        className={input.toolState === "annotate" ? "active" : ""}
        onClick={_ => input.setToolState("annotate")}
        title="Annotate"
      />

      <MR.ActionButton
        children={<I.SelectAllOutlined />}
        className={input.toolState === "select" ? "active" : ""}
        onClick={_ => input.setToolState("select")}
        title="Select"
      />
      <MR.ActionButton
        children={<I.ZoomInOutlined />}
        className={input.toolState === "zoom" ? "active" : ""}
        onClick={_ => input.setToolState("zoom")}
        title="Zoom"
      />
      <MR.ActionButton
        children={<I.PanToolOutlined />}
        className={input.toolState === "pan" ? "active" : ""}
        onClick={_ => input.setToolState("pan")}
        title="Pan"
      />
    </M.Stack>
  )
}
