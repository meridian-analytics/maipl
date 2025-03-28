import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as MR from "@maipl/react"
import * as SchemaContext from "../../../SchemaContext"
import * as CopyPasteContext from "../../../CopyPasteContext"

export function PasteConfigButton() {
  const schema = SchemaContext.useContext()
  const copyPaste = CopyPasteContext.useContext()
  return (
    <MR.Menu
      icon={<I.Checklist />}
      autoClose={false}
      color={copyPaste.fields.size == 0 ? "warning" : "default"}
      title="Paste Configuration"
    >
      {Object.entries(schema.schema.properties).map(([key, field]) => (
        <M.MenuItem key={key}>
          <M.FormControlLabel
            control={
              <M.Checkbox
                checked={copyPaste.fields.has(key)}
                onChange={(e, v) => copyPaste.setField(key, v)}
              />
            }
            label={field.title}
          />
        </M.MenuItem>
      ))}
    </MR.Menu>
  )
}
