import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import React from "react"
import { ErrorBoundary } from "react-error-boundary"
import * as Specviz from "specviz-react"
import * as Audio from "specviz-react/audio"
import * as SchemaContext from "./SchemaContext"

export default function AnnotationForm(props: {
  sx?: M.SxProps
}) {
  const region = Specviz.useRegion()
  const ids = Array.from(region.transformedSelection)
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
  const audio = Audio.useContext()
  const regions = Specviz.useRegion()
  const focus = Specviz.useFocus()
  const region = regions.regions.get(props.regionId)
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
        focus.region &&
        !audio.transport.state.pause &&
        region.id == focus.region.id ? (
          <MR.ActionButton
            key="0"
            children={<I.Stop />}
            onClick={() => {
              audio.transport.stop()
              focus.setFocus(null)
            }}
            title="Stop Annotation"
          />
        ) : (
          <MR.ActionButton
            key="0"
            children={<I.PlayArrow />}
            onClick={() => {
              focus.setFocus(region.id)
              audio.transport.play()
            }}
            title="Play Annotation"
          />
        ),
        <MR.ActionButton
          key="1"
          children={<I.DeleteForever />}
          disabled={!regions.canDelete(region)}
          onClick={regions.delete}
          title="Delete Annotation"
        />,
      ]}
      contents={
        <M.Box sx={{ marginTop: -4, padding: 2 }}>
          <Form
            children=" "
            formData={region}
            onChange={e =>
              regions.updateRegion(region.id, { ...region, ...e.formData })
            }
            readonly={!regions.canUpdate(region)}
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
            <Specviz.Encoder.X {...region} />
            <M.Typography>Offset</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Specviz.Encoder.X2 {...region} />
            <M.Typography>Duration</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Specviz.Encoder.Y2 {...region} />
            <M.Typography>Min</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Specviz.Encoder.Y1 {...region} />
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
  const region = Specviz.useRegion()
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
        region.transformedRegions,
        region.transformedSelection,
      ),
    [region.transformedRegions, region.transformedSelection, schema.schema],
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
              region.updateSelectedRegions(r => ({ ...r, ...e.formData }))
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
