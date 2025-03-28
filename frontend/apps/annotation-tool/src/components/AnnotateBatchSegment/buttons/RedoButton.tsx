import * as I from "@mui/icons-material"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"

export function RedoButton() {
  const note = Specviz.Note.useContext()
  return (
    <MR.ActionButton
      children={<I.Redo />}
      disabled={note.redo == null}
      onClick={note.redo}
      title="Redo"
    />
  )
}
