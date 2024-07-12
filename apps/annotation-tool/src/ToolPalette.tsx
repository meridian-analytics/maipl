import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as Specviz from "specviz-react"

export default function ToolPalette(props: M.StackProps) {
  const tool = Specviz.useTool()
  return (
    <M.Stack {...props}>
      <MR.ActionButton
        children={<I.AddLocation />}
        className={tool.tool === "annotate" ? "active" : ""}
        onClick={_ => tool.setTool("annotate")}
        title="Annotate"
      />

      <MR.ActionButton
        children={<I.SelectAllOutlined />}
        className={tool.tool === "select" ? "active" : ""}
        onClick={_ => tool.setTool("select")}
        title="Select"
      />
      <MR.ActionButton
        children={<I.ZoomInOutlined />}
        className={tool.tool === "zoom" ? "active" : ""}
        onClick={_ => tool.setTool("zoom")}
        title="Zoom"
      />
      <MR.ActionButton
        children={<I.PanToolOutlined />}
        className={tool.tool === "pan" ? "active" : ""}
        onClick={_ => tool.setTool("pan")}
        title="Pan"
      />
    </M.Stack>
  )
}
