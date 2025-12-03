import { Detection, File, RunnerTask } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"

export default function DetectionsLoader() {
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params["taskId"], null)
  const maipl = MR.useMaipl()

  const { data: task, error } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["runner-tasks", taskId],
    queryFn: () => RunnerTask.get(maipl.client, taskId!),
  })

  const { data: model, error: modelError } = RQ.useQuery({
    enabled: task != null,
    queryKey: ["files", task?.model_file],
    queryFn: () => File.get(maipl.client, task?.model_file!),
  })

  const onClose = () => {
    navigate(-1)
  }

  return (
    <MR.Modal onClose={onClose} sx={{ height: "80vh" }}>
      {error != null ? (
        <M.Typography>{(error as Error).message}</M.Typography>
      ) : modelError != null ? (
        <M.Typography>{(modelError as Error).message}</M.Typography>
      ) : task == null || model == null ? (
        <M.CircularProgress />
      ) : (
        <Detections model={model} onClose={onClose} task={task} />
      )}
    </MR.Modal>
  )
}

function Detections(props: {
  task: RunnerTask.t
  model: File.t
  onClose: () => void
  sx?: M.SxProps
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const table = MR.Detections.useTable({
    filter: {
      label: "",
      score_max: 1,
      score_min: 0,
    },
    debounceDelay: 1000
  })

  const filter = R.useMemo<Detection.t_list_request>(() => {
    return {
      task: props.task.id,
      label: F.safeParseString(table.debouncedFilter.get("label"), ""),
      score_max: F.safeParseNumber(
        table.debouncedFilter.get("score_max"),
        1,
      ),
      score_min: F.safeParseNumber(
        table.debouncedFilter.get("score_min"),
        0,
      ),
      page: table.pagination.pageIndex + 1,
      size: table.pagination.pageSize,
    }
  }, [
    props.task.id,
    table.debouncedFilter,
    table.pagination.pageIndex,
    table.pagination.pageSize,
  ])

  const onExport = () => {
    if (exportMutation.isIdle) {
      // Map filter parameters to the new API format
      const exportParams: Parameters<typeof Detection.export>[1] = {
        task: props.task.id,
      }
      
      // Add label filter if provided
      const label = F.safeParseString(table.debouncedFilter.get("label"), "")
      if (label) {
        exportParams.label = label
      }
      
      // Map score_min to score__gte and score_max to score__lte
      const scoreMin = F.safeParseNumber(
        table.debouncedFilter.get("score_min"),
        null,
      )
      const scoreMax = F.safeParseNumber(
        table.debouncedFilter.get("score_max"),
        null,
      )
      
      if (scoreMin != null) {
        exportParams.score__gte = scoreMin
      }
      if (scoreMax != null) {
        exportParams.score__lte = scoreMax
      }
      
      return exportMutation.mutateAsync([maipl.client, exportParams])
    }
  }

  const exportMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Detection.export>) =>
      Detection.export(...vars),
    onError: (err, vars) => {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred"
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error exporting detections for task #{vars[1].task}: {errorMessage}
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("DetectionsLoader exportMutation error", err, vars)
      }
    },
    onSettled: () => {
      exportMutation.reset()
    },
    onSuccess: file => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          File has been exported successfully. Filename:{" "}
          <M.Link
            children={file.basename}
            download={file.basename}
            href={file.file}
            rel="noreferrer"
            target="_blank"
          />{" "}
          (saved in {file.maipl_folder})
        </M.Alert>
      ))
    },
  })

  const { data: detections, error: detectionsError } =
    MR.Detections.useQuery(filter)

  if (detectionsError != null) {
    return <M.Typography>{(detectionsError as Error).message}</M.Typography>
  }

  return (
    <M.Stack
      sx={{
        flexGrow: 1,
        height: "100%",
        overflow: "hidden",
        padding: 2,
        ...props.sx,
      }}
    >
      <M.Typography variant="h6">
        Detections for Task #{props.task.id}
      </M.Typography>
      <M.Stack direction="row">
        <M.TextField
          label="Label"
          onChange={e => table.filter.set("label", e.currentTarget.value)}
          placeholder="my-label"
          value={table.filter.get("label") ?? ""}
        />
        <M.TextField
          inputProps={{ step: 0.1 }}
          label="Score (min)"
          onChange={e => table.filter.set("score_min", e.currentTarget.value)}
          placeholder="0"
          type="number"
          value={table.filter.get("score_min") ?? ""}
        />
        <M.TextField
          inputProps={{ step: 0.1 }}
          label="Score (max)"
          onChange={e => table.filter.set("score_max", e.currentTarget.value)}
          placeholder="1"
          type="number"
          value={table.filter.get("score_max") ?? ""}
        />
      </M.Stack>
      <MR.Detections.Table
        {...table}
        rows={detections.data}
        count={detections.count}
        visibility={{
          file: false,
          id: false,
          select: false,
        }}
      />
      <M.Stack direction="row-reverse">
        <M.Button
          children="Save as .CSV"
          disabled={exportMutation.isPending}
          onClick={onExport}
          variant="contained"
        />
        <M.Button children="Close" onClick={props.onClose} />
      </M.Stack>
    </M.Stack>
  )
}
