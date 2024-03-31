import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import { ErrorBoundary } from "react-error-boundary"
import { Encoder } from "specviz-react"
import { useSpecviz } from "specviz-react/hooks"
import * as S from "./SchemaContext"
import * as W from "./WorkspaceContext"

export default function AnnotationForm(props: {
  sx?: M.SxProps
}) {
  const specviz = useSpecviz()
  const ids = [...specviz.selection]
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
        <M.Box sx={{ marginTop: -6, padding: 2 }}>
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
  const specviz = useSpecviz()
  const { schema, uiSchema } = S.useSchema()
  const region = workspace.filteredRegions.get(props.regionId)
  if (region == null)
    return <p>Warning: Selected region is hidden by one or more filters</p>
  return (
    <MR.Panel
      sx={props.sx}
      title="Edit Annotation"
      actions={[
        <MR.ActionButton
          children={<I.PlayArrow />}
          onClick={() => specviz.transport.loop(region.id)}
          title="Play Annotation"
        />,
        <MR.ActionButton
          children={<I.Stop />}
          onClick={() => specviz.transport.stop()}
          title="Stop Annotation"
        />,
        <MR.ActionButton
          children={<I.DeleteForever />}
          onClick={() => specviz.command.delete()}
          title="Delete Annotation"
        />,
      ]}
      contents={
        <M.Box sx={{ marginTop: -6, padding: 2 }}>
          <Form
            children=" "
            formData={region}
            onChange={e =>
              workspace.dispatch(
                W.actions.updateRegion({ ...region, ...e.formData }),
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
            <Encoder.X {...region} />
            <M.Typography>Offset</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Encoder.X2 {...region} />
            <M.Typography>Duration</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Encoder.Y2 {...region} />
            <M.Typography>Min</M.Typography>
          </M.Box>
          <M.Box className="encoder">
            <Encoder.Y1 {...region} />
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
        <M.Box sx={{ marginTop: -6, padding: 2 }}>
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
