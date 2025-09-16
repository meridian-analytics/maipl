import * as I from "@mui/icons-material"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"

export function DeleteButton() {
  const note = Specviz.Note.useContext()
  return (
    <MR.ActionButton
      children={<I.Backspace />}
      disabled={note.selection.size == 0}
      onClick={() => note.delete(note.selection)}
      title="Delete Selected Annotations"
    />
  )
}
