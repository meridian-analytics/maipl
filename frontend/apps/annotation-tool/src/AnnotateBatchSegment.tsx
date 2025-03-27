import { Annotation, Batch, type Segment } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as Format from "@meridian-analytics/specviz/format"
import * as Rect from "@meridian-analytics/specviz/rect"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import Grid from "@mui/material/Unstable_Grid2"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import * as Z from "zod"
import AnnotationFilters from "./AnnotationFilters"
import AnnotationForm from "./AnnotationForm"
import AnnotationList from "./AnnotationList"
import * as AppContext from "./AppContext"
import AudioControls from "./AudioControls"
import * as CopyPasteContext from "./CopyPasteContext"
import * as FilterContext from "./FilterContext"
import Keybinds from "./Keybinds"
import Panel from "./Panel"
import * as SchemaContext from "./SchemaContext"
import ToolPalette from "./ToolPalette"

type LoaderData = {
  batch: Batch.t
  audio: Map<number, Segment.t_audio>
  image: Map<number, Segment.t_image>
  segments: Segment.t[]
  annotations: Annotation.t[]
  active: {
    audio: Segment.t_audio
    audioBuffer: AudioBuffer
    image: Segment.t_image
    segment: Segment.t
  }
  role: Batch.t_role_code
}

const AnnotateBatchSegmentQuery = (
  maipl: MR.t_context,
  batchId: number,
  segmentId: number
) => ({
  queryKey: ["annotate-batch-segment", batchId, segmentId],
  queryFn: async (): Promise<LoaderData> => {
    const batch = await Batch.get(maipl.client, batchId)
    if (batch == null) throw Error(`batch not found: ${batchId}`)

    const role =
      batch.role == null
        ? batch.user_id == maipl.user?.id
          ? Batch.t_role_code.owner
          : Batch.t_role_code.unassigned
        : batch.role.code
    if (role == Batch.t_role_code.unassigned)
      throw Error(`not assigned to batch: ${batchId}`)

    const [audio, image, segments, annotations] = await Promise.all([
      Batch.audios(maipl.client, batchId).then(
        (audios) => new Map(audios.map((a) => [a.segment_id, a]))
      ),
      Batch.images(maipl.client, batchId).then(
        (images) => new Map(images.map((i) => [i.segment_id, i]))
      ),
      Batch.segments(maipl.client, batchId),
      Annotation.readSegment(maipl.client, batchId, segmentId),
    ])

    const activeAudio = audio.get(segmentId)
    const activeImage = image.get(segmentId)
    const activeSegment = segments.find((s) => s.id == segmentId)

    if (activeAudio == null) throw Error(`audio not found: ${segmentId}`)
    if (activeImage == null) throw Error(`image not found: ${segmentId}`)
    if (activeSegment == null) throw Error(`segment not found: ${segmentId}`)

    const audioBuffer = await Specviz.Audio.load(activeAudio.audio)

    return {
      batch,
      audio,
      image,
      segments,
      annotations,
      active: {
        audioBuffer,
        audio: activeAudio,
        image: activeImage,
        segment: activeSegment,
      },
      role,
    }
  },
})

export const loader = (maipl: MR.t_context, queryClient: RQ.QueryClient) =>
  (async ({ request, params }): Promise<LoaderData> => {
    const batchId = Z.coerce.number().parse(params["batchId"])
    const segmentId = Z.coerce.number().parse(params["segmentId"])
    const query = AnnotateBatchSegmentQuery(maipl, batchId, segmentId)
    return queryClient.ensureQueryData(query)
  }) satisfies RR.LoaderFunction

export const loader2 = (maipl: MR.t_context) =>
  (async ({ request, params }): Promise<LoaderData> => {
    const batchId = Z.coerce.number().parse(params["batchId"])
    const segmentId = Z.coerce.number().parse(params["segmentId"])

    const batch = await Batch.get(maipl.client, batchId)
    if (batch == null) throw Error(`batch not found: ${batchId}`)

    const role =
      batch.role == null
        ? batch.user_id == maipl.user?.id
          ? Batch.t_role_code.owner
          : Batch.t_role_code.unassigned
        : batch.role.code
    if (role == Batch.t_role_code.unassigned)
      throw Error(`not assigned to batch: ${batchId}`)

    const [audio, image, segments, annotations] = await Promise.all([
      Batch.audios(maipl.client, batchId).then(
        (audios) => new Map(audios.map((a) => [a.segment_id, a]))
      ),
      Batch.images(maipl.client, batchId).then(
        (images) => new Map(images.map((i) => [i.segment_id, i]))
      ),
      Batch.segments(maipl.client, batchId),
      Annotation.readSegment(maipl.client, batchId, segmentId),
    ])

    const activeAudio = audio.get(segmentId)
    const activeImage = image.get(segmentId)
    const activeSegment = segments.find((s) => s.id == segmentId)

    if (activeAudio == null) throw Error(`audio not found: ${segmentId}`)
    if (activeImage == null) throw Error(`image not found: ${segmentId}`)
    if (activeSegment == null) throw Error(`segment not found: ${segmentId}`)

    const audioBuffer = await Specviz.Audio.load(activeAudio.audio)

    return {
      batch,
      audio,
      image,
      segments,
      annotations,
      active: {
        audioBuffer,
        audio: activeAudio,
        image: activeImage,
        segment: activeSegment,
      },
      role,
    }
  }) satisfies RR.LoaderFunction

function Provider(props: { children: R.ReactNode }) {
  const loaderData = RR.useLoaderData() as LoaderData
  return (
    <AppContext.Provider>
      <SchemaContext.Provider
        jsonSchema={loaderData.batch.annotation_file_text}
      >
        <Audio.Provider buffer={loaderData.active.audioBuffer}>
          <Specviz.Input.Provider>
            <AxisProvider>
              <FilterContext.Provider>
                <NoteProvider>
                  <FxProvider>
                    <Specviz.Viewport.Provider>
                      <BaseToolProvider>
                        {props.children}
                        <Specviz.Audio.Effect />
                        <Keybinds />
                      </BaseToolProvider>
                    </Specviz.Viewport.Provider>
                  </FxProvider>
                </NoteProvider>
              </FilterContext.Provider>
            </AxisProvider>
          </Specviz.Input.Provider>
        </Audio.Provider>
      </SchemaContext.Provider>
    </AppContext.Provider>
  )
}

function AxisProvider(props: { children: R.ReactNode }) {
  const loaderData = RR.useLoaderData() as LoaderData
  const axes: Specviz.Axis.Context = R.useMemo(() => {
    return {
      seconds: Specviz.Axis.time(
        loaderData.active.segment.start,
        loaderData.active.segment.end
      ),
      hertz: Specviz.Axis.nonlinear(
        loaderData.batch.frequency_axis,
        "hertz",
        Format.hz
      ),
    }
  }, [
    loaderData.active.segment.start,
    loaderData.active.segment.end,
    loaderData.batch.frequency_axis,
  ])
  return <Specviz.Axis.Provider value={axes} children={props.children} />
}

function NoteProvider(props: { children: R.ReactNode }) {
  const loaderData = RR.useLoaderData() as LoaderData
  const maipl = MR.useMaipl()
  const filter = FilterContext.useContext()
  const canCreate: Specviz.Note.Context["canCreate"] = R.useMemo(() => {
    switch (loaderData.role) {
      case Batch.t_role_code.unassigned:
      case Batch.t_role_code.viewer:
        return false
      case Batch.t_role_code.contributor:
      case Batch.t_role_code.collaborator:
      case Batch.t_role_code.owner:
        return true
    }
  }, [loaderData.role])
  const canDelete: Specviz.Note.Context<AppContext.UserData>["canDelete"] =
    R.useCallback(
      (region) => {
        switch (loaderData.role) {
          case Batch.t_role_code.unassigned:
          case Batch.t_role_code.viewer:
            return false
          case Batch.t_role_code.contributor:
            return region.properties?.user_id == maipl.user?.id
          case Batch.t_role_code.collaborator:
          case Batch.t_role_code.owner:
            return true
        }
      },
      [loaderData.role, maipl.user?.id]
    )
  const canRead: Specviz.Note.Context<AppContext.UserData>["canRead"] =
    R.useCallback(
      (region) => {
        switch (loaderData.role) {
          case Batch.t_role_code.unassigned:
            return false
          case Batch.t_role_code.contributor:
            return (
              region.properties?.user_id == loaderData.batch.user_id ||
              region.properties?.user_id == maipl.user?.id
            )
          case Batch.t_role_code.viewer:
          case Batch.t_role_code.collaborator:
          case Batch.t_role_code.owner:
            return true
        }
      },
      [loaderData.role, loaderData.batch.user_id, maipl.user?.id]
    )
  const canUpdate: Specviz.Note.Context<AppContext.UserData>["canUpdate"] =
    R.useCallback(
      (region) => {
        switch (loaderData.role) {
          case Batch.t_role_code.unassigned:
          case Batch.t_role_code.viewer:
            return false
          case Batch.t_role_code.contributor:
            return region.properties?.user_id == maipl.user?.id
          case Batch.t_role_code.collaborator:
          case Batch.t_role_code.owner:
            return true
        }
      },
      [loaderData.role, maipl.user?.id]
    )

  const initRegions = R.useMemo(() => {
    return new Map(
      loaderData.annotations.map((a) => [a.id, supportOpenRegions(a.region)])
    )
  }, [loaderData.annotations])

  return (
    <Specviz.Note.Provider
      canCreate={canCreate}
      canDelete={canDelete}
      canRead={canRead}
      canUpdate={canUpdate}
      children={
        <>
          <LoadRegionsEffect />
          {props.children}
        </>
      }
      render={MyAnnotationSvg}
      initRegions={initRegions}
      filterFn={filter.filterFn}
    />
  )
}

function supportOpenRegions(old: Specviz.Note.Region): Specviz.Note.Region {
  const { id, x, y, width, height, xunit, yunit, properties, ...splat } = old
  return {
    id,
    x,
    y,
    width,
    height,
    xunit,
    yunit,
    properties: {
      ...splat, // collect splat properties into properties object
      ...properties, // in collision, explicit properties override splat
    },
  }
}

function LoadRegionsEffect() {
  const note = Specviz.Note.useContext()
  const loaderData = RR.useLoaderData() as LoaderData
  R.useEffect(() => {
    note.reset(
      new Map(
        loaderData.annotations.map((a) => [a.id, supportOpenRegions(a.region)])
      )
    )
  }, [loaderData.annotations, note.reset])
  return <></>
}

function FxProvider(props: { children: React.ReactNode }) {
  const app = AppContext.useContext()
  const note = Specviz.Note.useContext()
  const fn: Specviz.Audio.TransformFxProps["fn"] = R.useCallback(
    (fxContext) => {
      const target = app.focus ? note.regions.get(app.focus) ?? null : null
      return target == null
        ? fxContext
        : {
            hpf: target.yunit === "hertz" ? target.y : undefined,
            lpf:
              target.yunit === "hertz" ? target.y + target.height : undefined,
            loop: [target.x, target.x + target.width],
          }
    },
    [app.focus, note.regions]
  )
  return <Specviz.Audio.TransformFx children={props.children} fn={fn} />
}

function BaseToolProvider(props: { children: R.ReactNode }) {
  const audio = Specviz.Audio.useContext()
  const onContextMenu: Specviz.Action.Handler["onContextMenu"] = R.useCallback(
    ({ unit, rel, abs, xaxis, yaxis, event }) => {
      // todo: bug if zoomed, when clicking in navigator, gives relative time
      audio.transport.seek(unit.x - xaxis.min)
    },
    [audio.transport.seek]
  )
  return (
    <Specviz.Action.Provider
      children={props.children}
      onContextMenu={onContextMenu}
    />
  )
}

function HorizontalAxisToolProvider(props: { children: R.ReactNode }) {
  const viewport = Specviz.Viewport.useContext()
  const onWheel: Specviz.Action.Handler["onWheel"] = R.useCallback(
    ({ dx, dy, event }) => {
      if (event.altKey) {
        viewport.zoomScroll(dy, 0)
      } else {
        viewport.zoomScroll(-dy, 0)
      }
    },
    [viewport.zoomScroll]
  )
  return <Specviz.Action.Provider children={props.children} onWheel={onWheel} />
}

function VerticalAxisToolProvider(props: { children: R.ReactNode }) {
  const viewport = Specviz.Viewport.useContext()
  const onWheel: Specviz.Action.Handler["onWheel"] = R.useCallback(
    ({ dx, dy, event }) => {
      if (event.altKey) {
        viewport.zoomScroll(0, dy)
      } else {
        viewport.zoomScroll(0, -dy)
      }
    },
    [viewport.zoomScroll]
  )
  return <Specviz.Action.Provider children={props.children} onWheel={onWheel} />
}

function NavigatorToolProvider(props: { children: R.ReactNode }) {
  const app = AppContext.useContext()
  const viewport = Specviz.Viewport.useContext()
  const onClick: Specviz.Action.Handler["onClick"] = R.useCallback(
    ({ unit, rel, abs, xaxis, yaxis, event }) => {
      switch (app.tool) {
        case "annotate":
        case "select":
        case "move":
          viewport.scrollTo({
            x: rel.x * viewport.state.zoom.x - 0.5,
            y: rel.y * viewport.state.zoom.y - 0.5,
          })
          break
        case "zoom":
          viewport.resetView()
          break
      }
    },
    [
      app.tool,
      viewport.resetView,
      viewport.scrollTo,
      viewport.state.zoom.x,
      viewport.state.zoom.y,
    ]
  )
  const onDrag: Specviz.Action.Handler["onDrag"] = R.useCallback(
    ({ dx, dy, event }) => {
      viewport.scroll(dx * viewport.state.zoom.x, dy * viewport.state.zoom.y)
    },
    [viewport.scroll, viewport.state.zoom.x, viewport.state.zoom.y]
  )
  const onWheel: Specviz.Action.Handler["onWheel"] = R.useCallback(
    ({ dx, dy, event }) => {
      if (event.altKey) {
        viewport.zoomScroll(dx, dy)
      } else {
        viewport.scroll(-dx, -dy)
      }
    },
    [viewport.zoomScroll, viewport.scroll]
  )
  return (
    <Specviz.Action.Provider
      children={props.children}
      onClick={onClick}
      onDrag={onDrag}
      onWheel={onWheel}
    />
  )
}

function VisualizationToolProvider(props: { children: R.ReactNode }) {
  const schema = SchemaContext.useContext()
  const app = AppContext.useContext()
  const maipl = MR.useMaipl()
  const note = Specviz.Note.useContext()
  const viewport = Specviz.Viewport.useContext()
  const onWheel: Specviz.Action.Handler["onWheel"] = R.useCallback(
    ({ dx, dy, event }) => {
      if (event.altKey) {
        viewport.zoomScroll(-dx, -dy)
      } else {
        viewport.scroll(dx, dy)
      }
    },
    [viewport.zoomScroll, viewport.scroll]
  )
  const action: Specviz.Action.Context = R.useMemo(() => {
    switch (app.tool) {
      case AppContext.Tool.Annotate:
        return {
          onClick: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            note.selectPoint(
              abs,
              Specviz.Note.selectionMode(event),
              xaxis,
              yaxis
            )
          },
          onRect: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            const [x, width] =
              xaxis.unit == "seconds"
                ? [unit.x, unit.width]
                : [xaxis.min, xaxis.max - xaxis.min]
            const [y, height] =
              yaxis.unit == "hertz"
                ? [unit.y, unit.height]
                : [yaxis.min, yaxis.max - yaxis.min]
            note.create(
              {
                id: Format.randomBytes(10),
                x,
                y,
                width,
                height,
                xunit: xaxis.unit,
                yunit: yaxis.unit,
                properties: {
                  ...Object.fromEntries(schema.defaults),
                  user_id: maipl.user?.id,
                },
              },
              { autoSelect: true }
            )
          },
          onWheel,
        }
      case AppContext.Tool.Select:
        return {
          onClick: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            note.selectPoint(
              abs,
              Specviz.Note.selectionMode(event),
              xaxis,
              yaxis
            )
          },
          onRect: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            note.selectArea(
              abs,
              Specviz.Note.selectionMode(event),
              xaxis,
              yaxis
            )
          },
          onWheel,
        }
      case AppContext.Tool.Zoom:
        return {
          onClick: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            viewport.zoomPoint(
              abs,
              event.ctrlKey || event.metaKey
                ? Specviz.Viewport.ZoomDirection.out
                : Specviz.Viewport.ZoomDirection.in
            )
          },
          onRect: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            viewport.zoomArea(abs)
          },
          onWheel,
        }
      case AppContext.Tool.Move:
        return {
          onDrag: ({ dx, dy, event, xaxis, yaxis }) => {
            if (note.selection.size == 0) {
              viewport.scroll(-dx, -dy)
            } else {
              note.move(
                note.selection,
                (rect) =>
                  Rect.move(
                    rect,
                    dx / viewport.state.zoom.x,
                    dy / viewport.state.zoom.y
                  ),
                xaxis,
                yaxis
              )
            }
          },
          onWheel,
        }
    }
  }, [
    onWheel,
    app.tool,
    maipl.user?.id,
    note.create,
    note.move,
    note.selectArea,
    note.selectPoint,
    note.selection,
    schema.defaults,
    viewport.scroll,
    viewport.state.zoom.x,
    viewport.state.zoom.y,
    viewport.zoomArea,
    viewport.zoomPoint,
  ])
  return <Specviz.Action.Provider children={props.children} {...action} />
}

export function Component() {
  const loaderData = RR.useLoaderData() as LoaderData
  const panelStyle: M.SxProps = { height: "40vh", overflow: "auto" }
  const [showFilters, setShowFilters] = R.useState(false)
  return (
    <Provider>
      <Grid
        container
        sx={{
          maxHeight: "100%",
          overflow: "hidden",
        }}
      >
        <Grid xs={12}>
          <M.Stack direction="row" spacing={2}>
            <M.Typography variant="h5">
              {loaderData.batch.batch_name}
            </M.Typography>
            <M.Stack flexGrow={5} />

            {/* View & Navigation Group */}
            <M.Stack direction="row" spacing={1}>
              <ShortcutsMenu />
              <ToolPalette direction="row" />
              <AudioControls direction="row" />
            </M.Stack>
            <M.Divider orientation="vertical" flexItem />

            {/* Annotation Management Group */}
            <M.Stack direction="row" spacing={1}>
              <CopyPasteContext.Provider>
                <CopyButton />
                <PasteButton />
                <PasteConfigButton />
                <DeleteButton />
              </CopyPasteContext.Provider>
            </M.Stack>
            <M.Divider orientation="vertical" flexItem />

            {/* History & Save Group */}
            <M.Stack direction="row" spacing={1}>
              <UndoButton />
              <RedoButton />
              <SaveButton />
            </M.Stack>
          </M.Stack>
        </Grid>
        <Grid xs={12}>
          <VisualizationTool />
        </Grid>
        <Grid xs={4}>
          <SegmentList sx={panelStyle} />
        </Grid>
        <Grid xs={4}>
          {showFilters ? (
            <AnnotationFilters
              setShowFilters={setShowFilters}
              sx={panelStyle}
            />
          ) : (
            <AnnotationList setShowFilters={setShowFilters} sx={panelStyle} />
          )}
        </Grid>
        <Grid xs={4}>
          <AnnotationForm sx={panelStyle} />
        </Grid>
      </Grid>
    </Provider>
  )
}

function VisualizationTool() {
  const loaderData = RR.useLoaderData() as LoaderData
  const app = AppContext.useContext()
  const showSelection = app.tool != AppContext.Tool.Move
  return (
    <M.Paper
      sx={{
        margin: "0 auto",
        overflow: "hidden",
        padding: "1rem",
        resize: "horizontal",
      }}
    >
      <div
        style={{
          display: "grid",
          gridGap: "1rem",
          gridTemplateColumns: "80px 1fr",
          gridTemplateRows: "40px 300px 20px",
          gridTemplateAreas: `
            ". nav"
            "y spec"
            ". x"
          `,
        }}
      >
        <Specviz.Plane.Provider xaxis="seconds" yaxis="hertz">
          <div style={{ gridArea: "nav" }}>
            <NavigatorToolProvider>
              <Specviz.Navigator src={loaderData.active.image.image} />
            </NavigatorToolProvider>
          </div>
          <div style={{ gridArea: "x", overflow: "hidden" }}>
            <HorizontalAxisToolProvider>
              <Specviz.Axis.Horizontal />
            </HorizontalAxisToolProvider>
          </div>
          <div style={{ gridArea: "y", overflow: "hidden" }}>
            <VerticalAxisToolProvider>
              <Specviz.Axis.Vertical />
            </VerticalAxisToolProvider>
          </div>
          <div style={{ gridArea: "spec" }}>
            <VisualizationToolProvider>
              <Specviz.Visualization
                showSelection={showSelection}
                src={loaderData.active.image.image}
              />
            </VisualizationToolProvider>
          </div>
        </Specviz.Plane.Provider>
      </div>
    </M.Paper>
  )
}

function SegmentList(props: { sx?: M.SxProps }) {
  const loaderData = RR.useLoaderData() as LoaderData
  return (
    <Panel
      title={`Segments (${loaderData.segments.length})`}
      sx={props.sx}
      contents={
        <M.List disablePadding>
          {loaderData.segments.map((s) => (
            <M.ListItem disablePadding key={s.id}>
              <M.ListItemButton
                component={RR.Link}
                to={`/annotate/${loaderData.batch.id}/segment/${s.id}`}
                selected={s.id == loaderData.active.segment.id}
              >
                <M.ListItemText
                  primary={s.filename}
                  secondary={F.duration(s.start, s.end)}
                />
              </M.ListItemButton>
            </M.ListItem>
          ))}
        </M.List>
      }
    />
  )
}

function MyAnnotationSvg(
  props: Specviz.Note.AnnotationProps<AppContext.UserData>
) {
  const [mounted, setMounted] = R.useState(false)

  R.useEffect(() => {
    setMounted(true)
  }, [])

  const lines = props.selected
    ? [
        `${props.region?.properties?.label ?? "?"} ${
          props.region?.properties?.score ?? 0
        }`,
        `${Format.timestamp(props.region.x)} - ${Format.timestamp(
          props.region.x + props.region.width
        )}`,
        props.region.yunit == "hertz"
          ? `${Format.hz(props.region.y)} - ${Format.hz(
              props.region.y + props.region.height
            )}`
          : "",
      ]
    : [
        `${props.region?.properties?.label ?? "?"} ${
          props.region?.properties?.score ?? 0
        }`,
      ]
  return (
    <svg {...props.svgProps} key={mounted ? 1 : 0}>
      <rect
        style={{
          width: "100%",
          height: "100%",
          fill: "rgba(66, 66, 66, 0.66)",
          stroke: "rgba(200, 200, 200, 0.66)",
          strokeWidth: "1",
          vectorEffect: "non-scaling-stroke",
        }}
      />
      {lines.map((line, lineno) => (
        <text
          key={String(lineno)}
          x="4"
          y={String(4 + 24 * lineno)}
          style={{
            fill: "rgba(200, 200, 200, 0.66)",
            fontSize: "10pt",
            textAnchor: "start",
            alignmentBaseline: "hanging",
            fontFamily: "monospace",
            mixBlendMode: "difference",
          }}
          children={line}
        />
      ))}
    </svg>
  )
}

function CopyButton() {
  const { copy } = CopyPasteContext.useContext()
  return (
    <MR.ActionButton
      children={<I.ContentCopy />}
      disabled={copy == null}
      onClick={copy}
      title="Copy Annotation Properties"
    />
  )
}

function DeleteButton() {
  const note = Specviz.Note.useContext()
  return (
    <MR.ActionButton
      children={<I.Backspace />}
      disabled={note.selection.size == 0}
      onClick={() => note.delete(note.selection)}
      title="Delete Selected Annotations"
    />
  )
}

function PasteButton() {
  const cp = CopyPasteContext.useContext()
  return (
    <MR.ActionButton
      children={<I.ContentPaste />}
      disabled={cp.paste == null}
      onClick={cp.paste}
      title="Paste Annotation Properties"
    />
  )
}

function PasteConfigButton() {
  const schema = SchemaContext.useContext()
  const copyPaste = CopyPasteContext.useContext()
  return (
    <MR.Menu
      icon={<I.Checklist />}
      autoClose={false}
      color={copyPaste.fields.size == 0 ? "warning" : "default"}
      title="Paste Configuration"
    >
      {Object.entries(schema.schema.properties).map(([key, field]) => (
        <M.MenuItem key={key}>
          <M.FormControlLabel
            control={
              <M.Checkbox
                checked={copyPaste.fields.has(key)}
                onChange={(e, v) => copyPaste.setField(key, v)}
              />
            }
            label={field.title}
          />
        </M.MenuItem>
      ))}
    </MR.Menu>
  )
}

function RedoButton() {
  const note = Specviz.Note.useContext()
  return (
    <MR.ActionButton
      children={<I.Redo />}
      disabled={note.redo == null}
      onClick={note.redo}
      title="Redo"
    />
  )
}

function UndoButton() {
  const note = Specviz.Note.useContext()
  return (
    <MR.ActionButton
      children={<I.Undo />}
      disabled={note.undo == null}
      onClick={note.undo}
      title="Undo"
    />
  )
}

function SaveButton() {
  const loaderData = RR.useLoaderData() as LoaderData
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const note = Specviz.Note.useContext()
  const queryClient = RQ.useQueryClient()
  const saveMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Annotation.updateSegment>) =>
      Annotation.updateSegment(...vars),
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not save annotations
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("AnnotationTool saveMutation error", err, vars)
      }
    },
    onSettled: () => {
      saveMutation.reset()
    },
    onSuccess: (segments) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="success">
          Success: Saved {segments.length} annotations
        </M.Alert>
      ))
      queryClient.refetchQueries({
        queryKey: [
          "annotate-batch-segment",
          loaderData.batch.id,
          loaderData.active.segment.id,
        ],
      })
      note.reset(note.regions)
    },
  })
  const onSave = () => {
    if (loaderData.active.segment == null) return
    if (!note.canCreate) return
    if (saveMutation.isPending) return
    // acl: todo: batch patch action to save only own annotations
    return saveMutation.mutateAsync([
      maipl.client,
      loaderData.batch.id,
      loaderData.active.segment.id,
      Array.from(note.regions.values(), (r) => ({
        id: r.id,
        created_at: new Date(),
        region: r,
      })),
    ])
  }
  return (
    <MR.ActionButton
      children={<I.Save />}
      disabled={note.undo == null || saveMutation.isPending || !note.canCreate}
      onClick={() => onSave()}
      title="Save Batch"
    />
  )
}

function ShortcutsMenu() {
  const [anchorEl, setAnchorEl] = R.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <MR.ActionButton
        children={<I.Keyboard />}
        onClick={handleClick}
        title="Keyboard Shortcuts"
      />
      <M.Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            Tool Selection
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>A - Annotate</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>S - Select</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>D - Zoom</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>F - Move</M.Typography>
        </M.MenuItem>
        <M.Divider />
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            Annotation Movement
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>← - Move Left</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>→ - Move Right</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>↑ - Move Up</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>↓ - Move Down</M.Typography>
        </M.MenuItem>
        <M.Divider />
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            Audio Controls
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Z - Seek to Start</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>X - Play</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>C - Stop</M.Typography>
        </M.MenuItem>
        <M.Divider />
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            General
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Esc - Deselect</M.Typography>
        </M.MenuItem>
        <M.Divider />
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            Mouse Controls
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Alt + Mouse Wheel - Zoom</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Ctrl/Cmd + Click - Zoom Out</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Click - Zoom In</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Drag - Pan/Move</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Right Click - Seek to Position</M.Typography>
        </M.MenuItem>
      </M.Menu>
    </>
  )
}

export default Component
