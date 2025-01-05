import * as M from "@mui/material"
import * as JSF from "@rjsf/utils"
import React from "react"

type State = string[]

type Options = Map<string, React.ReactNode>

const initialState: State = []

export default function EnumWidget(props: JSF.WidgetProps) {
  const state: State = Array.isArray(props.value) ? props.value : initialState
  const options: Options = React.useMemo(() => {
    const ui = JSF.getUiOptions(props.uiSchema)
    const r: Options = new Map([
      ["", <Placeholder children={ui.placeholder} />],
    ])
    for (const o of JSF.optionsList(props.schema, props.uiSchema) ?? [])
      r.set(o.value, o.label)
    return r
  }, [props.schema, props.uiSchema])
  React.useEffect(() => {
    if (state == initialState) {
      props.onChange(Array.from(options.keys()))
    }
  }, [state, props.onChange, options])
  return (
    <>
      <M.FormLabel>{props.label}</M.FormLabel>
      <M.FormGroup>
        {Array.from(options, ([value, label]) => (
          <M.FormControlLabel
            key={value}
            control={
              <M.Checkbox
                checked={state.includes(value)}
                onChange={(e, checked) => {
                  props.onChange(
                    checked ? [...state, value] : state.filter(v => v != value),
                  )
                }}
              />
            }
            label={label}
          />
        ))}
      </M.FormGroup>
    </>
  )
}

function Placeholder(props: { children?: React.ReactNode }) {
  return <i>{props.children ?? "(Null)"}</i>
}
