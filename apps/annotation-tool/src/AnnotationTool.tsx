import { Annotation, Batch } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import Grid from "@mui/material/Unstable_Grid2"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import { Audio, Navigator, Specviz, Visualization } from "specviz-react"
import { linear } from "specviz-react/axis"
import { formatHz, formatTimestamp } from "specviz-react/format"
import { useAxes } from "specviz-react/hooks"
import * as Z from "zod"
import * as A from "./AnnotationContext"
import AnnotationFilters from "./AnnotationFilters"
import AnnotationForm from "./AnnotationForm"
import AnnotationList from "./AnnotationList"
import AudioControls from "./AudioControls"
import Keybinds from "./Keybinds"
import SegmentList from "./SegmentList"
import ToolPalette from "./ToolPalette"
import * as W from "./WorkspaceContext"

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

const panelStyle: M.SxProps = { height: "35vh", overflow: "auto" }

function AnnotationTool() {
  const ctx = A.useAnnotationContext()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const workspace = W.useWorkspace()
  const queryClient = RQ.useQueryClient()
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
        Array.from(workspace.state.regions.values(), region => ({
          id: region.id,
          created_at: new Date(),
          region,
        })),
      ])
    }
  }

  const [showFilters, setShowFilters] = R.useState(false)

  return (
    <Specviz
      axes={axes}
      regions={workspace.filteredRegions}
      setRegions={s =>
        workspace.dispatch(
          W.actions.updateRegions(
            typeof s == "function" ? s(workspace.filteredRegions) : s,
          ),
        )
      }
    >
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
                  <AudioControls direction="row" />
                  <M.Stack flexGrow={1} />
                  <ToolPalette direction="row" />
                </M.Stack>
                <Keybinds />
              </>
            )}
          </M.Stack>
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
    </Specviz>
  )
}
