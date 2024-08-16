import * as Specviz from "specviz-react"
import * as Audio from "specviz-react/audio"

export default function Keybinds() {
  const audio = Audio.useContext()
  const region = Specviz.useRegion()
  const tool = Specviz.useTool()
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
      <Specviz.Keypress bind="a" onKeyDown={() => tool.setTool("annotate")} />
      <Specviz.Keypress bind="s" onKeyDown={() => tool.setTool("select")} />
      <Specviz.Keypress bind="d" onKeyDown={() => tool.setTool("zoom")} />
      <Specviz.Keypress bind="f" onKeyDown={() => tool.setTool("pan")} />
      <Specviz.Keypress bind="z" onKeyDown={() => audio.transport.seek(0)} />
      <Specviz.Keypress bind="x" onKeyDown={() => audio.transport.play()} />
      <Specviz.Keypress bind="c" onKeyDown={() => audio.transport.stop()} />
    </Specviz.Bindings>
  )
}
