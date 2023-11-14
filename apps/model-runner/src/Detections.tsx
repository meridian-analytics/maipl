import { Detection, File, Task } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"

export default function DetectionsLoader() {
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params.taskId, null)
  const maipl = MR.useMaipl()

  const { data: task, error } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["tasks", taskId],
    queryFn: () => Task.get(maipl.client, taskId!),
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
    <MR.Modal onClose={onClose}>
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
  task: Task.t
  model: File.t
  onClose: () => void
  sx?: M.SxProps
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const table = MR.Detections.useTable()

  const filter = R.useMemo<Detection.t_list_request>(() => {
    return {
      task: props.task.id,
      label: F.safeParseString(table.debouncedFilter.get("label"), undefined),
      score_max: F.safeParseNumber(
        table.debouncedFilter.get("score_max"),
        undefined,
      ),
      score_min: F.safeParseNumber(
        table.debouncedFilter.get("score_min"),
        undefined,
      ),
      page: table.pagination.pageIndex + 1, // bug: when query changes, page needs to be reset
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
      return exportMutation.mutateAsync([
        maipl.client,
        {
          ...filter,
          task: props.task.id,
          model: props.model.id,
        },
      ])
    }
  }

  const exportMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Detection.export>) =>
      Detection.export(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not export detections for task #{vars[1].task}
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("DetectionsLoader exportMutation error", err, vars)
      }
    },
    onSuccess: file => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Exported detections to{" "}
          <M.Link
            children={`${file.maipl_folder}/${file.basename}`}
            download={file.basename}
            href={file.file}
            rel="noreferrer"
            target="_blank"
          />
        </M.Alert>
      ))
      props.onClose()
    },
  })

  const { data: detections, error: detectionsError } =
    MR.Detections.useQuery(filter)

  if (detectionsError != null) {
    return <M.Typography>{(detectionsError as Error).message}</M.Typography>
  }

  return (
    <M.Stack
      spacing={2}
      sx={{
        flexGrow: 1,
        maxHeight: "100%",
        overflow: "hidden",
        padding: 2,
        ...props.sx,
      }}
    >
      <M.Typography variant="h6">
        Detections for Task #{props.task.id}
      </M.Typography>
      <M.Stack direction="row" spacing={2}>
        <M.TextField
          label="Label"
          onChange={e => table.filter.set("label", e.currentTarget.value)}
          placeholder="my-label"
          size="small"
          value={table.filter.get("label") ?? ""}
          variant="outlined"
        />
        <M.TextField
          inputProps={{ step: 0.1 }}
          label="Score (min)"
          onChange={e => table.filter.set("score_min", e.currentTarget.value)}
          placeholder="0"
          size="small"
          type="number"
          value={table.filter.get("score_min") ?? ""}
          variant="outlined"
        />
        <M.TextField
          inputProps={{ step: 0.1 }}
          label="Score (max)"
          onChange={e => table.filter.set("score_max", e.currentTarget.value)}
          placeholder="1"
          size="small"
          type="number"
          value={table.filter.get("score_max") ?? ""}
          variant="outlined"
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
      <M.Stack direction="row-reverse" spacing={2}>
        <M.Button
          children="Save as .CSV"
          color="primary"
          disabled={exportMutation.isLoading}
          onClick={onExport}
          variant="contained"
        />
        <M.Button
          children="Close"
          color="primary"
          onClick={props.onClose}
          variant="outlined"
        />
      </M.Stack>
    </M.Stack>
  )
}
