import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import NumberMinMaxWidget from "./NumberMinMaxWidget"
import * as S from "./SchemaContext"
import * as W from "./WorkspaceContext"

export default function AnnotationFilters(props: {
  setShowFilters: (show: boolean) => void
  sx?: M.SxProps
}) {
  const workspace = W.useWorkspace()
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
    <MR.Panel
      sx={props.sx}
      title={`Filter Annotations (${workspace.filteredRegions.size} /
            ${workspace.state.regions.size})`}
      actions={
        Object.keys(workspace.state.filters).length > 0
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
                  workspace.dispatch(W.actions.resetFilters())
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
            formData={workspace.state.filters}
            schema={schema}
            uiSchema={derivedUi}
            validator={validator}
            widgets={{
              NumberMinMaxWidget,
            }}
            onChange={e => workspace.dispatch(W.actions.setFilters(e.formData))}
          />
        </M.Box>
      }
    />
  )
}
