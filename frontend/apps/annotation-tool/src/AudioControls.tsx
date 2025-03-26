import * as Audio from "@meridian-analytics/specviz/audio"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as MR from "@maipl/react"

export default function AudioControls(props: M.StackProps) {
  const audio = Audio.useContext()
  return (
    <M.Stack {...props}>
      <MR.ActionButton
        onClick={(_) => audio.transport.seek(0)}
        children={<I.SkipPrevious />}
        title="Seek to Start (Z)"
      />
      <MR.ActionButton
        onClick={(_) => audio.transport.play()}
        className={audio.state.pause ? "" : "active"}
        children={<I.PlayArrow />}
        title="Play (X)"
      />
      <MR.ActionButton
        onClick={(_) => audio.transport.stop()}
        className={audio.state.pause ? "active" : ""}
        children={<I.Stop />}
        title="Stop (C)"
      />
    </M.Stack>
  )
}
