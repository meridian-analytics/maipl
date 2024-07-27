import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import * as React from "react"
import * as Specviz from "specviz-react"
import * as FilterContext from "./FilterContext"
import NumberMinMaxWidget from "./NumberMinMaxWidget"
import * as SchemaContext from "./SchemaContext"

function objectFlatMap<A, B>(
  object: Record<string, A>,
  fn: (entry: [string, A]) => Array<[string, B]>,
): Record<string, B> {
  return Object.fromEntries(Object.entries(object).flatMap(entry => fn(entry)))
}

export default function AnnotationFilters(props: {
  setShowFilters: (show: boolean) => void
  sx?: M.SxProps
}) {
  const schema = SchemaContext.useContext()
  const filter = FilterContext.useContext()
  const region = Specviz.useRegion()
  const derivedUi: SchemaContext.UiSchema = React.useMemo(
    () => ({
      ...schema.uiSchema,
      ...objectFlatMap(schema.schema.properties, ([key, field]) => {
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
    }),
    [schema.schema, schema.uiSchema],
  )
  return (
    <MR.Panel
      sx={props.sx}
      title={`Filter Annotations (${region.transformedRegions.size} /
            ${region.regions.size})`}
      actions={
        Object.keys(filter.filters).length > 0
          ? [
              <MR.ActionButton
                key="0"
                children={<I.FilterList color="info" />}
                onClick={() => props.setShowFilters(false)}
                title="Apply Filters"
              />,
              <MR.ActionButton
                key="1"
                children={<I.FilterListOff color="warning" />}
                onClick={() => {
                  filter.dispatch(FilterContext.resetFilters())
                  props.setShowFilters(false)
                }}
                title="Reset Filters"
              />,
            ]
          : [
              <MR.ActionButton
                key="0"
                children={<I.FilterList />}
                onClick={() => props.setShowFilters(false)}
                title="Close Filters"
              />,
            ]
      }
      contents={
        <M.Box sx={{ marginTop: -6, padding: 2 }}>
          <Form
            formData={filter.filters}
            schema={schema.schema}
            uiSchema={derivedUi}
            validator={validator}
            widgets={{
              NumberMinMaxWidget,
            }}
            onChange={e =>
              filter.dispatch(FilterContext.setFilters(e.formData))
            }
          />
        </M.Box>
      }
    />
  )
}
