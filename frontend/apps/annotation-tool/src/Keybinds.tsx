import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as Rect from "@meridian-analytics/specviz/rect"
import * as AppContext from "./AppContext"

export default function Keybinds() {
  const audio = Audio.useContext()
  const note = Specviz.Note.useContext()
  const app = AppContext.useContext()
  return (
    <Specviz.Bindings>
      <Specviz.Keypress bind="Escape" onKeyDown={note.deselect} />
      <Specviz.Keypress
        bind="ArrowLeft"
        onKeyDown={e => {
          e.preventDefault()
          note.move(note.selection, rect => Rect.move(rect, -0.01, 0))
        }}
      />
      <Specviz.Keypress
        bind="ArrowRight"
        onKeyDown={e => {
          e.preventDefault()
          note.move(note.selection, rect => Rect.move(rect, 0.01, 0))
        }}
      />
      <Specviz.Keypress
        bind="ArrowUp"
        onKeyDown={e => {
          e.preventDefault()
          note.move(note.selection, rect => Rect.move(rect, 0, -0.03))
        }}
      />
      <Specviz.Keypress
        bind="ArrowDown"
        onKeyDown={e => {
          e.preventDefault()
          note.move(note.selection, rect => Rect.move(rect, 0, 0.03))
        }}
      />
      <Specviz.Keypress
        bind="_a"
        onKeyDown={() => app.setTool(AppContext.Tool.Annotate)}
      />
      <Specviz.Keypress
        bind="_s"
        onKeyDown={() => app.setTool(AppContext.Tool.Select)}
      />
      <Specviz.Keypress
        bind="_d"
        onKeyDown={() => app.setTool(AppContext.Tool.Zoom)}
      />
      <Specviz.Keypress
        bind="_f"
        onKeyDown={() => app.setTool(AppContext.Tool.Move)}
      />
      <Specviz.Keypress bind="_z" onKeyDown={() => audio.transport.seek(0)} />
      <Specviz.Keypress bind="_x" onKeyDown={() => audio.transport.play()} />
      <Specviz.Keypress bind="_c" onKeyDown={() => audio.transport.stop()} />
    </Specviz.Bindings>
  )
}
