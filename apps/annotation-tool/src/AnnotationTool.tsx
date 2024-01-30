import { Annotation, Batch, Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import Grid from "@mui/material/Unstable_Grid2"
import { Form } from "@rjsf/mui"
import { RJSFSchema, UiSchema } from "@rjsf/utils"
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

function PreloadedAnnotationTool(props: {
  batch: Batch.t
  segments: Array<Segment.t>
  images: Map<number, Segment.t_image>
  audios: Map<number, Segment.t_audio>
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const segmentId = RR.useParams()?.segmentId
  const queryClient = RQ.useQueryClient()

  const { segment, audio, image } = R.useMemo(
    () => ({
      segment: props.segments.find(s => s.id == Number(segmentId)) ?? null,
      audio: props.audios.get(Number(segmentId)),
      image: props.images.get(Number(segmentId)),
    }),
    [props.audios, props.images, props.segments, segmentId],
  )

  const [regions, setRegions] = useRegionState()

  const annotations = RQ.useQuery({
    initialData: [],
    queryKey: ["annotations", segment?.id],
    queryFn: () =>
      Annotation.readSegment(maipl.client, props.batch.id, segment!.id),
    enabled: segment != null,
  })

  R.useEffect(() => {
    if (annotations.data) {
      setRegions(new Map(annotations.data.map(a => [a.id, a.region])))
    }
  }, [annotations.data, setRegions])

  const axes = useAxes(() => {
    return {
      seconds: linear(
        segment?.start ?? 0,
        segment?.end ?? 60,
        "seconds",
        formatTimestamp,
      ),
      hertz: linear(
        props.batch.parameters.freq_max ?? 10000,
        props.batch.parameters.freq_min ?? 0,
        "hertz",
        formatHz,
      ),
    }
  }, [
    segment?.start,
    segment?.end,
    props.batch.parameters.freq_max,
    props.batch.parameters.freq_min,
  ])

  const annotationFileText = R.useMemo(() => {
    try {
      return JSON.parse(props.batch.annotation_file_text) as {
        schema: RJSFSchema
        uiSchema: UiSchema
      }
    } catch (err) {
      console.warn("AnnotationTool schema parse error", err)
      return undefined
    }
  }, [props.batch.annotation_file_text])

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
      queryClient.refetchQueries({ queryKey: ["annotations", segment?.id] })
    },
  })

  const onSave = () => {
    if (saveMutation.isIdle && segment != null) {
      return saveMutation.mutateAsync([
        maipl.client,
        props.batch.id,
        segment.id,
        Array.from(regions.values(), region => ({
          id: region.id,
          created_at: new Date(),
          region,
        })),
      ])
    }
  }

  // no segments in batch
  if (props.segments.length == 0) return <p>No segments in batch</p>
  // url did not specify segmentId, navigate to first segment.id
  if (segmentId == null)
    return (
      <RR.Navigate
        to={`/annotate/${props.batch.id}/segment/${props.segments[0].id}`}
        replace={true}
      />
    )
  // fetching
  if (annotations.isFetching) return <p>Loading...</p>
  // error
  if (annotations.error)
    return <p>Error: {(annotations.error as Error).message}</p>
  // annotations.data is loaded
  // segmentId is a number
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
            <M.Typography variant="h5">{props.batch.batch_name}</M.Typography>
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
            {segment == null ? (
              <p>Choose a segment...</p>
            ) : audio == null ? (
              <p>Error: Audio for segment could not be loaded.</p>
            ) : image == null ? (
              <p>Error: Image for segment could not be loaded</p>
            ) : (
              <>
                <Audio
                  src={audio.audio}
                  duration={segment.end - segment.start}
                />
                <Navigator
                  src={image.image}
                  xaxis={axes.seconds}
                  yaxis={axes.hertz}
                />
                <Visualization
                  src={image.image}
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
          <Segments
            batch={props.batch}
            segments={props.segments}
            selectedId={segmentId}
            sx={{ maxHeight: "40vh", overflow: "auto" }}
          />
        </Grid>
        <Grid xs={4}>
          <Annotations
            batch={props.batch}
            sx={{ maxHeight: "40vh", overflow: "auto" }}
          />
        </Grid>
        <Grid xs={4}>
          <AnnotationForm
            schema={annotationFileText?.schema}
            uiSchema={annotationFileText?.uiSchema}
            sx={{ maxHeight: "40vh", overflow: "auto" }}
          />
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
  batch: Batch.t
  segments: Array<Segment.t>
  selectedId: string
  sx?: M.SxProps
}) {
  return (
    <M.Paper sx={props.sx}>
      <M.List>
        <M.ListSubheader>Segments ({props.segments.length})</M.ListSubheader>
        {props.segments.map(segment => (
          <M.ListItem disablePadding key={segment.id}>
            <M.ListItemButton
              component={RR.Link}
              to={`/annotate/${props.batch.id}/segment/${segment.id}`}
              selected={String(segment.id) == props.selectedId}
            >
              <M.ListItemText
                primary={segment.filename}
                secondary={`${segment.start.toFixed(2)} - ${segment.end.toFixed(
                  2,
                )}`}
              />
            </M.ListItemButton>
          </M.ListItem>
        ))}
      </M.List>
    </M.Paper>
  )
}

function Annotations(props: {
  batch: Batch.t
  sx?: M.SxProps
}) {
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
                  secondary={`${region.x.toFixed(2)} - ${(
                    region.x + region.width
                  ).toFixed(2)} sec`}
                  primary={region.label == null ? "Unlabeled" : region.label}
                />
              </M.ListItemButton>
            </M.ListItem>
          ))}
      </M.List>
    </M.Paper>
  )
}

function AnnotationForm(props: {
  schema?: RJSFSchema
  sx?: M.SxProps
  uiSchema?: UiSchema
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
              <NullForm schema={props.schema} uiSchema={props.uiSchema} />
            ) : ids.length == 1 ? (
              <MonoForm
                region={regions.get(ids[0])!}
                schema={props.schema}
                uiSchema={props.uiSchema}
              />
            ) : (
              <PolyForm schema={props.schema} uiSchema={props.uiSchema} />
            )}
          </M.ListItem>
        </M.List>
      </M.Paper>
    </ErrorBoundary>
  )
}

function NullForm(props: { schema?: RJSFSchema; uiSchema?: UiSchema }) {
  return (
    <Form
      children=" "
      formData={{}}
      readonly={true}
      schema={props.schema ?? {}}
      uiSchema={props.uiSchema}
      validator={validator}
    />
  )
}

function MonoForm(props: {
  region: Annotation.t_region
  schema?: RJSFSchema
  uiSchema?: UiSchema
}) {
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
        schema={props.schema ?? {}}
        uiSchema={props.uiSchema}
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

function PolyForm(props: { schema?: RJSFSchema; uiSchema?: UiSchema }) {
  return (
    <Form
      children=" "
      formData={{}}
      readonly={true}
      schema={props.schema ?? {}}
      uiSchema={props.uiSchema}
      validator={validator}
    />
  )
}

export default function AnnotationTool(props: { sx?: M.SxProps }) {
  const maipl = MR.useMaipl()
  const batchId = RR.useParams()?.batchId
  const batch = RQ.useQuery({
    enabled: batchId != null,
    queryKey: ["batches", batchId],
    queryFn: () => Batch.get(maipl.client, Number(batchId)),
  })
  const audio = RQ.useQuery({
    enabled: batchId != null,
    initialData: new Map(),
    queryKey: ["batches", batchId, "audios"],
    queryFn: () =>
      Batch.audios(maipl.client, Number(batchId)).then(
        arr => new Map(arr.map(audio => [audio.segment_id, audio])),
      ),
  })
  const image = RQ.useQuery({
    enabled: batchId != null,
    initialData: new Map(),
    queryKey: ["batches", batchId, "images"],
    queryFn: () =>
      Batch.images(maipl.client, Number(batchId)).then(
        arr => new Map(arr.map(image => [image.segment_id, image])),
      ),
  })
  const segments = RQ.useQuery({
    enabled: batch.data != null,
    initialData: [],
    queryKey: ["batches", batchId, "segments"],
    queryFn: () =>
      // todo: change to
      // Batch.segments(maipl.client, Number(batchId))
      Segment.list(maipl.client, {
        ids: batch.data!.segments,
      }).then(r => r.data),
  })
  // url did not specify batchId
  if (batchId == null) return <p>Batch ID not specified</p>
  // fetching
  if (
    batch.isFetching ||
    segments.isFetching ||
    audio.isFetching ||
    image.isFetching
  )
    return <p>Loading...</p>
  // errors
  if (batch.error) return <p>Error: {(batch.error as Error).message}</p>
  if (audio.error) return <p>Error: {(audio.error as Error).message}</p>
  if (image.error) return <p>Error: {(image.error as Error).message}</p>
  if (segments.error) return <p>Error: {(segments.error as Error).message}</p>
  // batch not found
  if (batch.data == null) return <p>Batch not found</p>
  // batch.data is loaded
  return (
    <M.Stack
      sx={{
        maxHeight: "100%",
        overflow: "hidden",
        padding: 2,
        ...props.sx,
      }}
    >
      <PreloadedAnnotationTool
        batch={batch.data}
        segments={segments.data}
        images={image.data}
        audios={audio.data}
      />
    </M.Stack>
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
