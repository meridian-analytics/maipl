import { Annotation, Batch, Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
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

function SegmentActions(props: { batch: Batch.t; segment: Segment.t }) {
  return (
    <M.Stack direction="row">
      <MR.ActionButton
        children={<I.Architecture />}
        component={RR.Link}
        to={`/annotate/${props.batch.id}/segment/${props.segment.id}`}
        title="Annotate"
      />
    </M.Stack>
  )
}

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

  const segmentsTable = MR.useTable<Segment.t>({
    pagination: {
      pageIndex: 0,
      pageSize: 10,
    },
  })

  const segmentsTableExtraColumns = R.useMemo(
    () => [
      MR.Segments.column.display({
        id: "actions",
        header: "",
        cell: info => (
          <SegmentActions batch={props.batch} segment={info.row.original} />
        ),
      }),
    ],
    [props.batch],
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

  const form = R.useMemo(() => {
    try {
      return JSON.parse(props.batch.form) as {
        schema: RJSFSchema
        uiSchema: UiSchema
      }
    } catch (err) {
      console.warn("AnnotationTool schema parse error", err)
      return undefined
    }
  }, [props.batch.form])

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
  // annotations. data is loaded
  // segmentId is a number
  return (
    <Specviz axes={axes} regions={regions} setRegions={setRegions}>
      <M.Grid container sx={{ maxHeight: "100%", overflow: "hidden" }}>
        {/* main window */}
        <M.Grid item xs={8} sx={{ maxHeight: "100%", overflow: "hidden" }}>
          <M.Stack sx={{ maxHeight: "100%", overflow: "hidden" }}>
            {/* segments */}
            <MR.Segments.Table
              {...segmentsTable}
              rows={props.segments}
              columns={segmentsTableExtraColumns}
              visibility={{
                select: false,
                created_at: false,
                duration: false,
              }}
            />
            {/* audio/visual */}

            {segment == null ? (
              <p>Choose a segment...</p>
            ) : audio == null ? (
              <p>Error: Audio for segment could not be loaded.</p>
            ) : image == null ? (
              <p>Error: Image for segment could not be loaded</p>
            ) : (
              <M.Stack>
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
                <MyKeybinds />
              </M.Stack>
            )}

            {/* controls */}
            <M.Stack direction="row" flexShrink={0}>
              <MyAudioControls direction="row" />
              <M.Button
                children="Save"
                disabled={saveMutation.isPending}
                onClick={onSave}
                variant="contained"
              />
              <M.Stack flexGrow={1} />
              <ToolPalette direction="row" />
            </M.Stack>
          </M.Stack>
        </M.Grid>
        {/* side column */}
        <M.Grid item xs={4} paddingX={2}>
          <M.Stack>
            <M.Typography variant="h5">{segment?.filename}</M.Typography>
            <AnnotationForm schema={form?.schema} uiSchema={form?.uiSchema} />
          </M.Stack>
        </M.Grid>
      </M.Grid>
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

function AnnotationForm(props: { schema?: RJSFSchema; uiSchema?: UiSchema }) {
  const { regions, selection } = useSpecviz()
  const ids = [...selection]
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <p>Error: {error.message}</p>}
    >
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
  const { transport, setRegions } = useSpecviz()
  const { region } = props
  return (
    <M.Stack>
      <Form
        children=" "
        formData={props.region}
        onChange={e =>
          setRegions(prev =>
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
          fullWidth
          onClick={() => transport.loop(region.id)}
          color="primary"
          variant="contained"
          children="Play annotation"
        />
        <M.Button
          fullWidth
          onClick={() => transport.stop()}
          color="primary"
          children="Stop"
        />
      </M.Stack>
    </M.Stack>
  )
}

function PolyForm(props: { schema?: RJSFSchema; uiSchema?: UiSchema }) {
  const { selection } = useSpecviz()
  return (
    <>
      <M.Typography variant="h6">
        {selection.size} annotations selected
      </M.Typography>
      <Form
        children=" "
        formData={{}}
        readonly={true}
        schema={props.schema ?? {}}
        uiSchema={props.uiSchema}
        validator={validator}
      />
    </>
  )
}

export default function AnnotationTool(props: { sx?: M.SxProps }) {
  const { client } = MR.useMaipl()
  const batchId = RR.useParams()?.batchId
  const batch = RQ.useQuery({
    enabled: batchId != null,
    queryKey: ["batches", batchId],
    queryFn: () => Batch.get(client, Number(batchId)),
  })
  const audio = RQ.useQuery({
    enabled: batchId != null,
    initialData: new Map(),
    queryKey: ["batches", batchId, "audios"],
    queryFn: () =>
      Batch.audios(client, Number(batchId)).then(
        arr => new Map(arr.map(audio => [audio.segment_id, audio])),
      ),
  })
  const image = RQ.useQuery({
    enabled: batchId != null,
    initialData: new Map(),
    queryKey: ["batches", batchId, "images"],
    queryFn: () =>
      Batch.images(client, Number(batchId)).then(
        arr => new Map(arr.map(image => [image.segment_id, image])),
      ),
  })
  const segments = RQ.useQuery({
    enabled: batch.data != null,
    initialData: {
      data: [],
      count: 0,
      page: 1,
      size: 10,
      prev: null,
      next: null,
    },
    queryKey: ["batches", batchId, "segments"],
    queryFn: () =>
      Segment.list(client, {
        ids: batch.data!.segments,
      }),
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
        segments={segments.data.data}
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
        title="Z"
        onClick={_ => transport.play()}
        className={transportState.type === "play" ? "active" : ""}
        children="Play"
      />
      <M.Button
        title="X"
        onClick={_ => transport.stop()}
        className={transportState.type === "stop" ? "active" : ""}
        children="Stop"
      />
    </M.Stack>
  )
}

function MyKeybinds() {
  const { command, transport } = useSpecviz()
  return (
    <Bindings>
      <Keypress bind="Backspace" onKeyDown={command.delete} />
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
      <Keypress bind="z" onKeyDown={transport.play} />
      <Keypress bind="x" onKeyDown={transport.stop} />
    </Bindings>
  )
}
