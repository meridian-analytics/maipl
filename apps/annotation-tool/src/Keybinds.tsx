import { useSpecviz } from "specviz-react/hooks"
import { Bindings, Keypress } from "specviz-react/keybinds"

export default function Keybinds() {
  const { command, transport } = useSpecviz()
  return (
    <Bindings>
      <Keypress bind="Escape" onKeyDown={command.deselect} />
      <Keypress
        bind="ArrowLeft"
        onKeyDown={e => {
          e.preventDefault()
          command.moveSelection(-0.01, 0)
        }}
      />
      <Keypress
        bind="ArrowRight"
        onKeyDown={e => {
          e.preventDefault()
          command.moveSelection(0.01, 0)
        }}
      />
      <Keypress
        bind="ArrowUp"
        onKeyDown={e => {
          e.preventDefault()
          command.moveSelection(0, -0.03)
        }}
      />
      <Keypress
        bind="ArrowDown"
        onKeyDown={e => {
          e.preventDefault()
          command.moveSelection(0, 0.03)
        }}
      />
      <Keypress bind="a" onKeyDown={() => command.tool("annotate")} />
      <Keypress bind="s" onKeyDown={() => command.tool("select")} />
      <Keypress bind="d" onKeyDown={() => command.tool("zoom")} />
      <Keypress bind="f" onKeyDown={() => command.tool("pan")} />
      <Keypress bind="z" onKeyDown={() => transport.seek(0)} />
      <Keypress bind="x" onKeyDown={() => transport.play()} />
      <Keypress bind="c" onKeyDown={() => transport.stop()} />
    </Bindings>
  )
}
