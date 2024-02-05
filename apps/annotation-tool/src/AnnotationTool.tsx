import { Annotation, Batch } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import Grid from "@mui/material/Unstable_Grid2"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import { ErrorBoundary } from "react-error-boundary"
import * as RR from "react-router-dom"
import {
  Audio,
  Encoder,
  Navigator,
  Specviz,
  Visualization,
} from "specviz-react"
import { linear } from "specviz-react/axis"
import { formatHz, formatTimestamp } from "specviz-react/format"
import { useAxes, useRegionState, useSpecviz } from "specviz-react/hooks"
import { Bindings, Keypress } from "specviz-react/keybinds"
import * as Z from "zod"
import * as A from "./AnnotationContext.tsx"
import * as S from "./SchemaContext.tsx"

export function LoadFromBatchId() {
  const maipl = MR.useMaipl()
  const params = RR.useParams()
  const batchId = Z.coerce.number().parse(params.batchId)
  const batch = RQ.useQuery({
    queryKey: ["batches", batchId],
    queryFn: () => Batch.get(maipl.client, batchId),
  })
  if (batch.isFetching) return <p>Loading...</p>
  if (batch.error) return <p>Error: {batch.error.message}</p>
  if (batch.data == null) return <p>Error: Batch not found</p>
  if (batch.data.segments.length == 0) return <p>Error: Segments not found</p>
  return (
    <RR.Navigate
      to={`/annotate/${batchId}/segment/${batch.data.segments[0]}`}
      replace={true}
    />
  )
}

export function LoadFromBatchIdAndSegmentId() {
  const params = RR.useParams()
  const batchId = Z.coerce.number().parse(params.batchId)
  const segmentId = Z.coerce.number().parse(params.segmentId)
  return (
    <A.AnnotationContextProvider batchId={batchId} segmentId={segmentId}>
      <AnnotationTool />
    </A.AnnotationContextProvider>
  )
}

function AnnotationTool() {
  const ctx = A.useAnnotationContext()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()
  const [regions, setRegions] = useRegionState(
    () => new Map(ctx.annotations.map(a => [a.id, a.region])),
  )
  const axes = useAxes(() => {
    return {
      seconds: linear(
        ctx.active.segment?.start ?? 0,
        ctx.active.segment?.end ?? 60,
        "seconds",
        formatTimestamp,
      ),
      hertz: linear(
        ctx.batch.parameters.freq_max ?? 10000,
        ctx.batch.parameters.freq_min ?? 0,
        "hertz",
        formatHz,
      ),
    }
  }, [
    ctx.active.segment?.start,
    ctx.active.segment?.end,
    ctx.batch.parameters.freq_max,
    ctx.batch.parameters.freq_min,
  ])

  const saveMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Annotation.updateSegment>) =>
      Annotation.updateSegment(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not save annotations
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("AnnotationTool saveMutation error", err, vars)
      }
    },
    onSettled: () => {
      saveMutation.reset()
    },
    onSuccess: segments => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Saved {segments.length} annotations
        </M.Alert>
      ))
      queryClient.refetchQueries({
        queryKey: ["annotations", ctx.active.segment?.id],
      })
    },
  })

  const onSave = () => {
    if (saveMutation.isIdle && ctx.active.segment != null) {
      return saveMutation.mutateAsync([
        maipl.client,
        ctx.batch.id,
        ctx.active.segment.id,
        Array.from(regions.values(), region => ({
          id: region.id,
          created_at: new Date(),
          region,
        })),
      ])
    }
  }
  return (
    <Specviz axes={axes} regions={regions} setRegions={setRegions}>
      <Grid
        container
        sx={{
          maxHeight: "100%",
          overflow: "hidden",
        }}
      >
        <Grid xs={12}>
          <M.Stack direction="row">
            <M.Typography variant="h5">{ctx.batch.batch_name}</M.Typography>
            <M.Stack flexGrow={1} />
            <MR.ActionButton
              children={<I.Save />}
              disabled={saveMutation.isPending}
              onClick={() => onSave()}
              title="Save Batch"
            />
          </M.Stack>
        </Grid>
        <Grid xs={12}>
          <M.Stack>
            {ctx.active.segment == null ? (
              <p>Choose a segment...</p>
            ) : ctx.active.audio == null ? (
              <p>Error: Audio for segment could not be loaded.</p>
            ) : ctx.active.image == null ? (
              <p>Error: Image for segment could not be loaded</p>
            ) : (
              <>
                <Audio
                  src={ctx.active.audio.audio}
                  duration={ctx.active.segment.end - ctx.active.segment.start}
                />
                <Navigator
                  src={ctx.active.image.image}
                  xaxis={axes.seconds}
                  yaxis={axes.hertz}
                />
                <Visualization
                  src={ctx.active.image.image}
                  xaxis={axes.seconds}
                  yaxis={axes.hertz}
                />
                <M.Stack direction="row" flexShrink={0}>
                  <MyAudioControls direction="row" />
                  <M.Stack flexGrow={1} />
                  <ToolPalette direction="row" />
                </M.Stack>
                <MyKeybinds />
              </>
            )}
          </M.Stack>
        </Grid>
        <Grid xs={4}>
          <Segments sx={{ height: "35vh", overflow: "auto" }} />
        </Grid>
        <Grid xs={4}>
          <Annotations sx={{ height: "35vh", overflow: "auto" }} />
        </Grid>
        <Grid xs={4}>
          <AnnotationForm sx={{ height: "35vh", overflow: "auto" }} />
        </Grid>
      </Grid>
    </Specviz>
  )
}

function ToolPalette(props: M.StackProps) {
  const { command, toolState } = useSpecviz()
  return (
    <M.Stack {...props}>
      <MR.ActionButton
        children={<I.AddLocation />}
        className={toolState === "annotate" ? "active" : ""}
        onClick={_ => command.tool("annotate")}
        title="Annotate"
      />

      <MR.ActionButton
        children={<I.SelectAllOutlined />}
        className={toolState === "select" ? "active" : ""}
        onClick={_ => command.tool("select")}
        title="Select"
      />
      <MR.ActionButton
        children={<I.ZoomInOutlined />}
        className={toolState === "zoom" ? "active" : ""}
        onClick={_ => command.tool("zoom")}
        title="Zoom"
      />
      <MR.ActionButton
        children={<I.PanToolOutlined />}
        className={toolState === "pan" ? "active" : ""}
        onClick={_ => command.tool("pan")}
        title="Pan"
      />
    </M.Stack>
  )
}

function Segments(props: {
  sx?: M.SxProps
}) {
  const ctx = A.useAnnotationContext()
  return (
    <M.Paper sx={props.sx}>
      <M.List>
        <M.ListSubheader>Segments ({ctx.segments.length})</M.ListSubheader>
        {ctx.segments.map(s => (
          <M.ListItem disablePadding key={s.id}>
            <M.ListItemButton
              component={RR.Link}
              to={`/annotate/${ctx.batch.id}/segment/${s.id}`}
              selected={s.id == ctx.active.segment?.id}
            >
              <M.ListItemText
                primary={s.filename}
                secondary={F.duration(s.start, s.end)}
              />
            </M.ListItemButton>
          </M.ListItem>
        ))}
      </M.List>
    </M.Paper>
  )
}

function Annotations(props: {
  sx?: M.SxProps
}) {
  const labels = S.useLabels()
  function order(a: Annotation.t_region, b: Annotation.t_region) {
    return a.x == b.x ? a.y - b.y : a.x - b.x
  }
  const specviz = useSpecviz()
  return (
    <M.Paper sx={props.sx}>
      <M.List>
        <M.ListSubheader>Annotations ({specviz.regions.size})</M.ListSubheader>
        {Array.from(specviz.regions.values(), r => r as Annotation.t_region) // todo: update specviz, remove mapping to t_region
          .sort(order)
          .map(region => (
            <M.ListItem disablePadding key={region.id}>
              <M.ListItemButton
                selected={specviz.selection.has(region.id)}
                onClick={() => specviz.setSelection(() => new Set([region.id]))}
              >
                <M.ListItemText
                  primary={
                    region.label == null
                      ? "Unlabeled"
                      : labels.lookup(region.label) ??
                        `Unknown: ${region.label}`
                  }
                  secondary={F.duration(region.x, region.x + region.width)}
                />
              </M.ListItemButton>
            </M.ListItem>
          ))}
      </M.List>
    </M.Paper>
  )
}

function AnnotationForm(props: {
  sx?: M.SxProps
}) {
  const { regions, selection } = useSpecviz()
  const ids = [...selection]
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <p>Error: {error.message}</p>}
    >
      <M.Paper
        sx={{
          ...props.sx,
        }}
      >
        <M.List>
          <M.ListSubheader
            children="Edit Annotation"
            sx={{
              zIndex: 10, // some rjsf components render z-index: 1
            }}
          />
          <M.ListItem sx={{ marginTop: -2 }}>
            {ids.length == 0 ? (
              <NullForm />
            ) : ids.length == 1 ? (
              <MonoForm region={regions.get(ids[0])!} />
            ) : (
              <PolyForm />
            )}
          </M.ListItem>
        </M.List>
      </M.Paper>
    </ErrorBoundary>
  )
}

function NullForm() {
  const { schema, uiSchema } = S.useSchema()
  return (
    <Form
      children=" "
      formData={{}}
      readonly={true}
      schema={schema}
      uiSchema={uiSchema}
      validator={validator}
    />
  )
}

function MonoForm(props: {
  region: Annotation.t_region
}) {
  const { schema, uiSchema } = S.useSchema()
  const specviz = useSpecviz()
  const { region } = props
  return (
    <M.Stack>
      <Form
        children=" "
        formData={props.region}
        onChange={e =>
          specviz.setRegions(prev =>
            new Map(prev).set(region.id, { ...region, ...e.formData }),
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
      <M.Stack direction="row" justifyContent="space-between">
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
      <M.Stack direction="row">
        <M.Button
          onClick={() => specviz.transport.loop(region.id)}
          color="primary"
          variant="contained"
          children={<I.PlayArrow />}
        />
        <M.Button
          onClick={() => specviz.transport.stop()}
          color="primary"
          children={<I.Stop />}
        />
        <M.Stack flexGrow={1} />
        <MR.ActionButton
          children={<I.DeleteForever />}
          onClick={() => specviz.command.delete()}
          title="Delete annotation"
        />
      </M.Stack>
    </M.Stack>
  )
}

function PolyForm() {
  const { schema, uiSchema } = S.useSchema()
  return (
    <Form
      children=" "
      formData={{}}
      readonly={true}
      schema={schema}
      uiSchema={uiSchema}
      validator={validator}
    />
  )
}

function MyAudioControls(props: M.StackProps) {
  const { transport, transportState } = useSpecviz()
  return (
    <M.Stack {...props}>
      <M.Button
        onClick={_ => transport.seek(0)}
        children={<I.SkipPrevious />}
      />
      <M.Button
        onClick={_ => transport.play()}
        className={transportState.type === "play" ? "active" : ""}
        children={<I.PlayArrow />}
      />
      <M.Button
        onClick={_ => transport.stop()}
        className={transportState.type === "stop" ? "active" : ""}
        children={<I.Stop />}
      />
    </M.Stack>
  )
}

function MyKeybinds() {
  const { command, transport } = useSpecviz()
  return (
    <Bindings>
      <Keypress bind="Escape" onKeyDown={command.deselect} />
      <Keypress
        bind="ArrowLeft"
        onKeyDown={e => {
          e.preventDefault()
          command.moveSelection(-0.01, 0)
        }}
      />
      <Keypress
        bind="ArrowRight"
        onKeyDown={e => {
          e.preventDefault()
          command.moveSelection(0.01, 0)
        }}
      />
      <Keypress
        bind="ArrowUp"
        onKeyDown={e => {
          e.preventDefault()
          command.moveSelection(0, -0.03)
        }}
      />
      <Keypress
        bind="ArrowDown"
        onKeyDown={e => {
          e.preventDefault()
          command.moveSelection(0, 0.03)
        }}
      />
      <Keypress bind="a" onKeyDown={() => command.tool("annotate")} />
      <Keypress bind="s" onKeyDown={() => command.tool("select")} />
      <Keypress bind="d" onKeyDown={() => command.tool("zoom")} />
      <Keypress bind="f" onKeyDown={() => command.tool("pan")} />
      <Keypress bind="z" onKeyDown={() => transport.seek(0)} />
      <Keypress bind="x" onKeyDown={() => transport.play()} />
      <Keypress bind="c" onKeyDown={() => transport.stop()} />
    </Bindings>
  )
}
