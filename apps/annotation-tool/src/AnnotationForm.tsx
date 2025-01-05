import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import React from "react"
import { ErrorBoundary } from "react-error-boundary"
import * as AppContext from "./AppContext"
import * as SchemaContext from "./SchemaContext"

export default function AnnotationForm(props: {
  sx?: M.SxProps
}) {
  const note = Specviz.Note.useContext()
  const ids = Array.from(note.selection)
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <p>Error: {error.message}</p>}
    >
      {ids.length == 0 ? (
        <NullForm sx={props.sx} />
      ) : ids.length == 1 ? (
        <MonoForm sx={props.sx} regionId={ids[0]} key={ids[0]} />
      ) : (
        <PolyForm sx={props.sx} />
      )}
    </ErrorBoundary>
  )
}

function NullForm(props: { sx?: M.SxProps }) {
  const schema = SchemaContext.useContext()
  return (
    <MR.Panel
      sx={props.sx}
      title="Edit Annotation"
      contents={
        <M.Box sx={{ marginTop: -4, padding: 2 }}>
          <Form
            children=" "
            formData={{}}
            readonly={true}
            schema={schema.schema}
            uiSchema={schema.uiSchema}
            validator={validator}
          />
        </M.Box>
      }
    />
  )
}

function MonoForm(props: {
  regionId: string
  sx?: M.SxProps
}) {
  const app = AppContext.useContext()
  const audio = Audio.useContext()
  const note = Specviz.Note.useContext()
  const region = note.regions.get(props.regionId)
  const schema = SchemaContext.useContext()
  const derivedUiSchema = React.useMemo(
    () => SchemaContext.deriveMonoFormUiSchema(schema.schema, schema.uiSchema),
    [schema.schema, schema.uiSchema],
  )
  if (region == null)
    return <p>Warning: Selected region is hidden by one or more filters</p>
  return (
    <MR.Panel
      sx={props.sx}
      title="Edit Annotation"
      actions={[
        app.focus && !audio.state.pause && region.id == app.focus ? (
          <MR.ActionButton
            key="0"
            children={<I.Stop />}
            onClick={() => {
              audio.transport.stop()
              app.setFocus(null)
            }}
            title="Stop Annotation"
          />
        ) : (
          <MR.ActionButton
            key="0"
            children={<I.PlayArrow />}
            onClick={() => {
              app.setFocus(region.id)
              audio.transport.play()
            }}
            title="Play Annotation"
          />
        ),
        <MR.ActionButton
          key="1"
          children={<I.DeleteForever />}
          disabled={!note.canDelete(region)}
          onClick={() => note.delete(new Set([region.id]))}
          title="Delete Annotation"
        />,
      ]}
      contents={
        <M.Box sx={{ marginTop: -4, padding: 2 }}>
          <Form
            children=" "
            formData={region.properties}
            onChange={e =>
              note.updateProperties(new Set([region.id]), prev =>
                updateProperties(prev ?? {}, schema.schema, e.formData),
              )
            }
            readonly={!note.canUpdate(region)}
            schema={schema.schema}
            uiSchema={derivedUiSchema}
            validator={validator}
          />
        </M.Box>
      }
      footer={
        <M.Stack
          sx={{ padding: 2 }}
          direction="row"
          justifyContent="space-between"
        >
          <M.Box className="encoder">
            <Specviz.Encoder.X1 region={region} label="s" />
            <M.Typography>Offset</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Specviz.Encoder.X2 region={region} label="s" />
            <M.Typography>Duration</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Specviz.Encoder.Y2
              direction={-1}
              format={v => (v / 1000).toFixed(3)}
              label="kHz"
              region={region}
            />
            <M.Typography>Min</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Specviz.Encoder.Y1
              direction={-1}
              format={v => (v / 1000).toFixed(3)}
              label="kHz"
              region={region}
            />
            <M.Typography>Max</M.Typography>
          </M.Box>
        </M.Stack>
      }
    />
  )
}

function PolyForm(props: {
  sx?: M.SxProps
}) {
  const note = Specviz.Note.useContext()
  const schema = SchemaContext.useContext()
  const derivedSchema = React.useMemo(
    () => SchemaContext.deriveSchemaWithoutDefaults(schema.schema),
    [schema.schema],
  )
  const derivedUi = React.useMemo(
    () => SchemaContext.derivePolyFormUiSchema(schema.schema, schema.uiSchema),
    [schema.schema, schema.uiSchema],
  )
  const formData = React.useMemo(
    () =>
      SchemaContext.derivePolyFormData(
        schema.schema,
        note.regions,
        note.selection,
      ),
    [note.regions, note.selection, schema.schema],
  )
  return (
    <MR.Panel
      sx={props.sx}
      title="Edit Annotation"
      contents={
        <M.Box sx={{ marginTop: -4, padding: 2 }}>
          <Form
            children=" "
            formData={formData}
            onChange={e => {
              note.updateProperties(note.selection, prev =>
                updateProperties(prev ?? {}, schema.schema, e.formData),
              )
            }}
            schema={derivedSchema}
            uiSchema={derivedUi}
            validator={validator}
          />
        </M.Box>
      }
    />
  )
}

function updateProperties(
  props: Record<string, unknown>,
  schema: SchemaContext.JsonSchema,
  formData: Record<string, unknown>,
) {
  const next = { ...props }
  let v: unknown
  for (const key in schema.properties) {
    v = formData[key]
    if (v === undefined) delete next[key]
    else next[key] = v
  }
  return next
}
