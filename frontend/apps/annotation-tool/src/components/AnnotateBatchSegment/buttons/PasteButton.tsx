import * as I from "@mui/icons-material"
import * as MR from "@maipl/react"
import * as CopyPasteContext from "../../../CopyPasteContext"

export function PasteButton() {
  const cp = CopyPasteContext.useContext()
  return (
    <MR.ActionButton
      children={<I.ContentPaste />}
      disabled={cp.paste == null}
      onClick={cp.paste}
      title="Paste Annotation Properties"
    />
  )
}
