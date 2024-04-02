import * as Specviz from "specviz-react"
import * as Audio from "specviz-react/audio"

export default function Keybinds() {
  const audio = Audio.useContext()
  const region = Specviz.useRegions()
  const input = Specviz.useInput()
  return (
    <Specviz.Bindings>
      <Specviz.Keypress bind="Escape" onKeyDown={region.deselect} />
      <Specviz.Keypress
        bind="ArrowLeft"
        onKeyDown={e => {
          e.preventDefault()
          region.moveSelection(-0.01, 0)
        }}
      />
      <Specviz.Keypress
        bind="ArrowRight"
        onKeyDown={e => {
          e.preventDefault()
          region.moveSelection(0.01, 0)
        }}
      />
      <Specviz.Keypress
        bind="ArrowUp"
        onKeyDown={e => {
          e.preventDefault()
          region.moveSelection(0, -0.03)
        }}
      />
      <Specviz.Keypress
        bind="ArrowDown"
        onKeyDown={e => {
          e.preventDefault()
          region.moveSelection(0, 0.03)
        }}
      />
      <Specviz.Keypress
        bind="a"
        onKeyDown={() => input.setToolState("annotate")}
      />
      <Specviz.Keypress
        bind="s"
        onKeyDown={() => input.setToolState("select")}
      />
      <Specviz.Keypress bind="d" onKeyDown={() => input.setToolState("zoom")} />
      <Specviz.Keypress bind="f" onKeyDown={() => input.setToolState("pan")} />
      <Specviz.Keypress bind="z" onKeyDown={() => audio.transport.seek(0)} />
      <Specviz.Keypress bind="x" onKeyDown={() => audio.transport.play()} />
      <Specviz.Keypress bind="c" onKeyDown={() => audio.transport.stop()} />
    </Specviz.Bindings>
  )
}
