import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as Rect from "@meridian-analytics/specviz/rect"
import * as AppContext from "./AppContext"

// Helper function to check if the event target is an input field
function isInputField(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.contentEditable === "true" ||
    target.getAttribute("role") === "textbox"
  )
}

export default function Keybinds() {
  const audio = Audio.useContext()
  const note = Specviz.Note.useContext()
  const app = AppContext.useContext()
  return (
    <Specviz.Bindings>
      <Specviz.Keypress
        bind="Escape"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            note.deselect()
          }
        }}
      />
      <Specviz.Keypress
        bind="ArrowLeft"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            e.preventDefault()
            note.move(note.selection, (rect) => Rect.move(rect, -0.01, 0))
          }
        }}
      />
      <Specviz.Keypress
        bind="ArrowRight"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            e.preventDefault()
            note.move(note.selection, (rect) => Rect.move(rect, 0.01, 0))
          }
        }}
      />
      <Specviz.Keypress
        bind="ArrowUp"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            e.preventDefault()
            note.move(note.selection, (rect) => Rect.move(rect, 0, -0.03))
          }
        }}
      />
      <Specviz.Keypress
        bind="ArrowDown"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            e.preventDefault()
            note.move(note.selection, (rect) => Rect.move(rect, 0, 0.03))
          }
        }}
      />
      <Specviz.Keypress
        bind="a"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            app.setTool(AppContext.Tool.Annotate)
          }
        }}
      />
      <Specviz.Keypress
        bind="s"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            app.setTool(AppContext.Tool.Select)
          }
        }}
      />
      <Specviz.Keypress
        bind="d"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            app.setTool(AppContext.Tool.Zoom)
          }
        }}
      />
      <Specviz.Keypress
        bind="f"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            app.setTool(AppContext.Tool.Move)
          }
        }}
      />
      <Specviz.Keypress
        bind="z"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            audio.transport.seek(0)
          }
        }}
      />
      <Specviz.Keypress
        bind="x"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            audio.transport.play()
          }
        }}
      />
      <Specviz.Keypress
        bind="c"
        onKeyDown={(e) => {
          if (!isInputField(e)) {
            audio.transport.stop()
          }
        }}
      />
    </Specviz.Bindings>
  )
}
