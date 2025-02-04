import * as M from "@mui/material"
import type * as R from "react"

export default function Switch(props: {
  disabled?: boolean
  label: string
  setValue: R.Dispatch<R.SetStateAction<boolean>>
  value: boolean
}) {
  return (
    <M.FormControlLabel
      control={
        <M.Switch
          checked={props.value}
          onChange={(_e, value) => props.setValue(value)}
        />
      }
      disabled={props.disabled}
      label={props.label}
    />
  )
}
