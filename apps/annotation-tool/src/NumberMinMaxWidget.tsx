import * as M from "@mui/material"
import * as JSF from "@rjsf/utils"

type State = [null | number, null | number]

export default function NumberMinMaxWidget(props: JSF.WidgetProps) {
  const value: State =
    typeof props.value == "object" ? props.value : [null, null]
  return (
    <M.Stack direction="row" spacing={2}>
      <M.TextField
        label={`${props.label ?? props.name} Min`}
        type="number"
        value={value[0] ?? ""}
        onChange={e =>
          props.onChange([
            e.target.value == "" ? null : Number(e.target.value),
            value[1],
          ])
        }
      />
      <M.TextField
        label={`${props.label ?? props.name} Max`}
        type="number"
        value={value[1] ?? ""}
        onChange={e =>
          props.onChange([
            value[0],
            e.target.value == "" ? null : Number(e.target.value),
          ])
        }
      />
    </M.Stack>
  )
}
