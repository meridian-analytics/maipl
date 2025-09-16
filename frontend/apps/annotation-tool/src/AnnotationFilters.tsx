import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import * as React from "react"
import EnumWidget from "./EnumWidget"
import * as FilterContext from "./FilterContext"
import NumberMinMaxWidget from "./NumberMinMaxWidget"
import * as SchemaContext from "./SchemaContext"

export default function AnnotationFilters(props: {
  setShowFilters: (show: boolean) => void
  sx?: M.SxProps
}) {
  const schema = SchemaContext.useContext()
  const filter = FilterContext.useContext()
  const note = Specviz.Note.useContext()
  const derivedSchema = React.useMemo(
    () => SchemaContext.deriveSchemaWithoutDefaults(schema.schema),
    [schema.schema],
  )
  const derivedUi = React.useMemo(
    () => SchemaContext.deriveFilterUiSchema(schema.schema, schema.uiSchema),
    [schema.schema, schema.uiSchema],
  )
  return (
    <MR.Panel
      sx={props.sx}
      title={`Filter Annotations (${note.regions.size} /
            ${note.count})`}
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
                  filter.resetFilters()
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
            schema={derivedSchema}
            uiSchema={derivedUi}
            validator={validator}
            widgets={{
              NumberMinMaxWidget,
              EnumWidget,
            }}
            onChange={e => filter.setFilters(e.formData)}
          />
        </M.Box>
      }
    />
  )
}
