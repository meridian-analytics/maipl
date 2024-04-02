import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as Audio from "specviz-react/audio"

export default function AudioControls(props: M.StackProps) {
  const audio = Audio.useContext()
  return (
    <M.Stack {...props}>
      <M.Button
        onClick={_ => audio.transport.seek(0)}
        children={<I.SkipPrevious />}
      />
      <M.Button
        onClick={_ => audio.transport.play()}
        className={audio.transport.state.pause ? "" : "active"}
        children={<I.PlayArrow />}
      />
      <M.Button
        onClick={_ => audio.transport.stop()}
        className={audio.transport.state.pause ? "active" : ""}
        children={<I.Stop />}
      />
    </M.Stack>
  )
}
