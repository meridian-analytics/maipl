import * as I from "@mui/icons-material"
import * as MR from "@maipl/react"
import * as CopyPasteContext from "../../../CopyPasteContext"

export function CopyButton() {
  const { copy } = CopyPasteContext.useContext()
  return (
    <MR.ActionButton
      children={<I.ContentCopy />}
      disabled={copy == null}
      onClick={copy}
      title="Copy Annotation Properties"
    />
  )
}
