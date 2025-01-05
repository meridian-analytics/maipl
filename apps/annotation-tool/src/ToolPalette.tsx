import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as AppContext from "./AppContext"

export default function ToolPalette(props: M.StackProps) {
  const app = AppContext.useContext()
  return (
    <M.Stack {...props}>
      <MR.ActionButton
        children={<I.AddLocation />}
        className={app.tool == AppContext.Tool.Annotate ? "active" : ""}
        onClick={_ => app.setTool(AppContext.Tool.Annotate)}
        title="Annotate"
      />

      <MR.ActionButton
        children={<I.SelectAllOutlined />}
        className={app.tool == AppContext.Tool.Select ? "active" : ""}
        onClick={_ => app.setTool(AppContext.Tool.Select)}
        title="Select"
      />
      <MR.ActionButton
        children={<I.ZoomInOutlined />}
        className={app.tool == AppContext.Tool.Zoom ? "active" : ""}
        onClick={_ => app.setTool(AppContext.Tool.Zoom)}
        title="Zoom"
      />
      <MR.ActionButton
        children={<I.PanToolOutlined />}
        className={app.tool == AppContext.Tool.Move ? "active" : ""}
        onClick={_ => app.setTool(AppContext.Tool.Move)}
        title="Move"
      />
    </M.Stack>
  )
}
