import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import { ErrorBoundary } from "react-error-boundary"
import * as Specviz from "specviz-react"
import * as Audio from "specviz-react/audio"
import * as AudioFocus from "./AudioFocus"
import * as S from "./SchemaContext"
import * as W from "./WorkspaceContext"

export default function AnnotationForm(props: {
  sx?: M.SxProps
}) {
  const workspace = W.useWorkspace()
  const ids = Array.from(workspace.state.selection)
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
  const { schema, uiSchema } = S.useSchema()
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
            schema={schema}
            uiSchema={uiSchema}
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
  const workspace = W.useWorkspace()
  const audio = Audio.useContext()
  const regions = Specviz.useRegions()
  const focus = AudioFocus.useContext()
  const region = workspace.state.regions.get(props.regionId)
  const { schema, uiSchema } = S.useSchema()
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
              focus.setFocusRegion(null)
            }}
            title="Stop Annotation"
          />
        ) : (
          <MR.ActionButton
            key="0"
            children={<I.PlayArrow />}
            onClick={() => {
              focus.setFocusRegion(region.id)
              audio.transport.play()
            }}
            title="Play Annotation"
          />
        ),
        <MR.ActionButton
          key="1"
          children={<I.DeleteForever />}
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
              workspace.dispatch(
                // todo: add Speviz.Region.update command
                W.actions.setRegions(prev =>
                  new Map(prev).set(region.id, { ...region, ...e.formData }),
                ),
              )
            }
            readonly={false}
            schema={schema}
            uiSchema={{
              ...uiSchema,
              score: {
                "ui:readonly": true,
                ...uiSchema.score,
              },
            }}
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
  const { schema, uiSchema } = S.useSchema()
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
            schema={schema}
            uiSchema={uiSchema}
            validator={validator}
          />
        </M.Box>
      }
    />
  )
}
