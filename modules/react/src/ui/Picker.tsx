import * as M from "@mui/material"

export default function Picker<T>(props: {
  disabled?: boolean
  fullWidth?: boolean
  label: string
  setValue: (newValue: T) => void
  value: T
  values: Array<T> | Record<string, T>
}) {
  return (
    <M.FormControl disabled={props.disabled} fullWidth={props.fullWidth}>
      <M.InputLabel>{props.label}</M.InputLabel>
      <M.Select
        label={props.label}
        value={String(props.value)}
        onChange={e => props.setValue(e.target.value as T)}
      >
        {Array.isArray(props.values)
          ? props.values.map(value => (
              <M.MenuItem
                key={String(value)}
                value={String(value)}
                children={String(value)}
              />
            ))
          : Object.entries(props.values).map(([key, value]) => (
              <M.MenuItem key={key} value={String(value)} children={key} />
            ))}
      </M.Select>
    </M.FormControl>
  )
}
