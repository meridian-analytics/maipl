import { Annotation, Batch } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import Grid from "@mui/material/Unstable_Grid2"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import * as Specviz from "specviz-react"
import * as Audio from "specviz-react/audio"
import * as Format from "specviz-react/format"
import * as Z from "zod"
import * as AnnotationContext from "./AnnotationContext"
import AnnotationFilters from "./AnnotationFilters"
import AnnotationForm from "./AnnotationForm"
import AnnotationList from "./AnnotationList"
import AudioControls from "./AudioControls"
import * as FilterContext from "./FilterContext"
import Keybinds from "./Keybinds"
import * as SchemaContext from "./SchemaContext"
import SegmentList from "./SegmentList"
import ToolPalette from "./ToolPalette"

export function LoadFromBatchId() {
  const maipl = MR.useMaipl()
  const params = RR.useParams()
  const batchId = Z.coerce.number().parse(params["batchId"])
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
  const batchId = Z.coerce.number().parse(params["batchId"])
  const segmentId = Z.coerce.number().parse(params["segmentId"])
  return (
    <AnnotationContext.Provider batchId={batchId} segmentId={segmentId}>
      <AnnotationTool />
    </AnnotationContext.Provider>
  )
}

const panelStyle: M.SxProps = { height: "35vh", overflow: "auto" }

function AnnotationTool() {
  const ctx = AnnotationContext.useContext()
  const axes: Specviz.Axes = R.useMemo(() => {
    return {
      seconds: Specviz.AxisContext.linear(
        ctx.active.segment.start,
        ctx.active.segment.end,
        "seconds",
        Format.timestamp,
      ),
      hertz: Specviz.AxisContext.linear(
        ctx.batch.parameters.freq_max,
        ctx.batch.parameters.freq_min,
        "hertz",
        Format.hz,
      ),
    }
  }, [
    ctx.active.segment.start,
    ctx.active.segment.end,
    ctx.batch.parameters.freq_max,
    ctx.batch.parameters.freq_min,
  ])

  const [showFilters, setShowFilters] = R.useState(false)

  return (
    <SchemaContext.Provider jsonSchema={ctx.batch.annotation_file_text}>
      <Audio.Provider url={ctx.active.audio.audio}>
        <Specviz.InputProvider>
          <Specviz.AxisProvider value={axes}>
            <Specviz.RegionProvider
              initRegions={() =>
                new Map(ctx.annotations.map(a => [a.id, a.region]))
              }
            >
              <FilterContext.Provider>
                <Specviz.FocusProvider>
                  <Specviz.ViewportProvider>
                    <Specviz.ToolProvider>
                      <Grid
                        container
                        sx={{
                          maxHeight: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <Grid xs={12}>
                          <M.Stack direction="row">
                            <M.Typography variant="h5">
                              {ctx.batch.batch_name}
                            </M.Typography>
                            <M.Stack flexGrow={1} />
                            <SaveButton />
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
                            <AnnotationList
                              setShowFilters={setShowFilters}
                              sx={panelStyle}
                            />
                          )}
                        </Grid>
                        <Grid xs={4}>
                          <AnnotationForm sx={panelStyle} />
                        </Grid>
                      </Grid>
                    </Specviz.ToolProvider>
                  </Specviz.ViewportProvider>
                </Specviz.FocusProvider>
              </FilterContext.Provider>
            </Specviz.RegionProvider>
          </Specviz.AxisProvider>
        </Specviz.InputProvider>
      </Audio.Provider>
    </SchemaContext.Provider>
  )
}

function VisualizationTool() {
  const ctx = AnnotationContext.useContext()
  return (
    <M.Stack>
      <Specviz.PlaneProvider xaxis="seconds" yaxis="hertz">
        <Specviz.Navigator src={ctx.active.image.image} />
        <Specviz.Visualization
          children={MyAnnotationSvg}
          src={ctx.active.image.image}
        />
      </Specviz.PlaneProvider>
      <M.Stack direction="row" flexShrink={0}>
        <AudioControls direction="row" />
        <M.Stack flexGrow={1} />
        <ToolPalette direction="row" />
      </M.Stack>
      <Keybinds />
    </M.Stack>
  )
}

function MyAnnotationSvg(props: Specviz.AnnotationProps) {
  const lines = props.selected
    ? [
        `${props.region["label"]} ${props.region["score"] ?? 0}`,
        `${Format.timestamp(props.region.x)} - ${Format.timestamp(
          props.region.x + props.region.width,
        )}`,
        props.region.yunit == "hertz"
          ? `${Format.hz(props.region.y)} - ${Format.hz(
              props.region.y + props.region.height,
            )}`
          : "",
      ]
    : [`${props.region["label"]} ${props.region["score"] ?? 0}`]
  return (
    <R.Fragment>
      {lines.map((line, lineno) => (
        <text
          key={String(lineno)}
          x="4"
          y={String(4 + 24 * lineno)}
          children={line}
        />
      ))}
    </R.Fragment>
  )
}

function SaveButton() {
  const ctx = AnnotationContext.useContext()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const region = Specviz.RegionContext.useContext()
  const queryClient = RQ.useQueryClient()
  const saveMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Annotation.updateSegment>) =>
      Annotation.updateSegment(...vars),
    onError: (err, vars) => {
      notify(onClose => (
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
    onSuccess: segments => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Saved {segments.length} annotations
        </M.Alert>
      ))
      queryClient.refetchQueries({
        queryKey: ["annotations", ctx.active.segment.id],
      })
    },
  })
  const onSave = () => {
    if (saveMutation.isIdle && ctx.active.segment != null) {
      return saveMutation.mutateAsync([
        maipl.client,
        ctx.batch.id,
        ctx.active.segment.id,
        Array.from(region.regions.values(), r => ({
          id: r.id,
          created_at: new Date(),
          region: r,
        })),
      ])
    }
  }
  return (
    <MR.ActionButton
      children={<I.Save />}
      disabled={saveMutation.isPending}
      onClick={() => onSave()}
      title="Save Batch"
    />
  )
}
