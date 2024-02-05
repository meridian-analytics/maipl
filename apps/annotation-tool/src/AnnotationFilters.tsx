import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import NumberMinMaxWidget from "./NumberMinMaxWidget.tsx"
import * as S from "./SchemaContext.tsx"

export default function AnnotationFilters<T>(props: {
  state: T
  setState: (state: T) => void
  sx?: M.SxProps
}) {
  const { schema, uiSchema } = S.useSchema()
  const derivedUi = {
    ...uiSchema,
    ...Object.fromEntries(
      Object.entries(schema.properties).flatMap(([key, field]) => {
        switch (field.type) {
          case "string":
            if ("enum" in field || "anyOf" in field || "oneOf" in field)
              return [[key, { "ui:widget": "CheckboxesWidget" }]]
            return []
          case "number":
            return [[key, { "ui:widget": "NumberMinMaxWidget" }]]
          default:
            return []
        }
      }),
    ),
  }
  return (
    <M.Box sx={props.sx}>
      <Form
        formData={props.state}
        schema={schema}
        uiSchema={derivedUi}
        validator={validator}
        widgets={{
          NumberMinMaxWidget,
        }}
        onChange={e => props.setState(e.formData)}
      />
    </M.Box>
  )
}
