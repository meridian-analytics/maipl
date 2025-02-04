import * as M from "@mui/material"

export default function Picker(props: {
  disabled?: boolean
  fullWidth?: boolean
  label: string
  setValue: (newValue: null | string) => void
  value: null | string
  values: Array<string> | Record<string, string>
}) {
  return (
    <M.FormControl disabled={props.disabled} fullWidth={props.fullWidth}>
      <M.InputLabel>{props.label}</M.InputLabel>
      <M.Select
        label={props.label}
        value={props.value}
        onChange={e => props.setValue(e.target.value)}
      >
        {Array.isArray(props.values)
          ? props.values.map(value => (
              <M.MenuItem key={value} value={value} children={value} />
            ))
          : Object.entries(props.values).map(([key, value]) => (
              <M.MenuItem key={key} value={value} children={key} />
            ))}
      </M.Select>
    </M.FormControl>
  )
}
