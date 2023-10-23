import { Detection, File, Task } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"

export default function DetectionsLoader(props: {
  onClose: () => void
}) {
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params.taskId, null)
  const { client } = MR.useMaipl()

  const { data: task, error } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["tasks", taskId],
    queryFn: () => Task.get(client, taskId!),
  })

  const { data: model, error: modelError } = RQ.useQuery({
    enabled: task != null,
    queryKey: ["files", task?.model_file],
    queryFn: () => File.get(client, task?.model_file!),
  })

  return (
    <MR.Modal onClose={props.onClose}>
      {error != null ? (
        <M.Typography>{(error as Error).message}</M.Typography>
      ) : modelError != null ? (
        <M.Typography>{(modelError as Error).message}</M.Typography>
      ) : task == null || model == null ? (
        <M.CircularProgress />
      ) : (
        <Detections model={model} onClose={props.onClose} task={task} />
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
          onClick={async () => {
            // todo: use react-query mutation
            try {
              const res = await Detection.export(maipl.client, {
                ...filter,
                task: props.task.id,
                model: props.model.id,
              })
              console.log(res)
            } catch (err) {
              console.error("Detection.export err", err)
            }
          }}
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
