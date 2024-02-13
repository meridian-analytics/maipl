import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { useSpecviz } from "specviz-react/hooks"

export default function AudioControls(props: M.StackProps) {
  const { transport, transportState } = useSpecviz()
  return (
    <M.Stack {...props}>
      <M.Button
        onClick={_ => transport.seek(0)}
        children={<I.SkipPrevious />}
      />
      <M.Button
        onClick={_ => transport.play()}
        className={transportState.type === "play" ? "active" : ""}
        children={<I.PlayArrow />}
      />
      <M.Button
        onClick={_ => transport.stop()}
        className={transportState.type === "stop" ? "active" : ""}
        children={<I.Stop />}
      />
    </M.Stack>
  )
}
