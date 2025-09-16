import * as I from "@mui/icons-material"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"

export function UndoButton() {
  const note = Specviz.Note.useContext()
  return (
    <MR.ActionButton
      children={<I.Undo />}
      disabled={note.undo == null}
      onClick={note.undo}
      title="Undo"
    />
  )
}
