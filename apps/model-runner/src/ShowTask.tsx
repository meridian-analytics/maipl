import { File, Task } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"

export default function ShowTaskLoader(props: {
  onClose: () => void
}) {
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params.taskId, null)
  const { client } = MR.useMaipl()

  const { data: task, error } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["tasks", taskId],
    queryFn: () => {
      console.log("fetching task", taskId)
      return Task.get(client, taskId!)
    },
  })

  const { data: model, error: modelError } = RQ.useQuery({
    enabled: task != null,
    queryKey: ["files", task?.model_file],
    queryFn: () => {
      console.log("fetching file", task?.model_file)
      return File.get(client, task?.model_file!)
    },
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
        <ShowTask task={task} model={model} onClose={props.onClose} />
      )}
    </MR.Modal>
  )
}

function ShowTask(props: {
  task: Task.t
  model: File.t
  onClose: () => void
}) {
  const { task, model } = props

  const {
    debouncedFilter,
    filter,
    folder,
    pagination,
    selection,
    setFolder,
    setPagination,
    setSelection,
  } = MR.Files.useTable({})

  const { data: files } = MR.Files.useQuery({
    ids: task.filelist,
    maipl_folder: folder,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  return (
    <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
      <M.Typography variant="h6">Task #{task.id}</M.Typography>
      <M.FormControl size="small">
        <M.InputLabel>Model</M.InputLabel>
        <M.Select
          disabled
          label="Model"
          size="small"
          value={model.id}
          variant="outlined"
        >
          <M.MenuItem value={model.id} children={`model/${model.path}`} />
        </M.Select>
      </M.FormControl>
      <M.TextField
        disabled
        label="Description"
        size="small"
        value={task.description}
        variant="outlined"
      />
      <M.Stack direction="row" spacing={2} justifyContent="space-between">
        <M.TextField
          disabled
          fullWidth
          label="Batch Size"
          size="small"
          type="number"
          value={task.batch_size}
          variant="outlined"
        />
        <M.TextField
          disabled
          fullWidth
          label="Step Size"
          size="small"
          type="number"
          value={task.step_size}
          variant="outlined"
        />
        <M.TextField
          disabled
          fullWidth
          label="Threshold"
          size="small"
          type="number"
          value={task.threshold}
          variant="outlined"
        />
        <M.TextField
          disabled
          fullWidth
          label="Buffer"
          size="small"
          type="number"
          value={task.buffer}
          variant="outlined"
        />
      </M.Stack>
      <M.Typography variant="h6" pt={3}>
        Input Files
      </M.Typography>
      <M.Stack direction="row" spacing={2}>
        <MR.MaiplFolderPicker
          folder={folder}
          folders={["public", "dataset", "raw"]}
          setFolder={setFolder}
        />
        <M.Button
          variant="contained"
          color="primary"
          onClick={filter.toggle}
          children={filter.enabled ? "Turn Off Filters" : "Turn On Filters"}
        />
        {filter.enabled && (
          <M.TextField
            size="small"
            label="Path"
            onChange={e => filter.set("path", e.currentTarget.value)}
            placeholder="path/to/folder"
            value={filter.get("path")}
            variant="outlined"
          />
        )}
        {filter.enabled && (
          <M.TextField
            size="small"
            label="Tag"
            onChange={e => filter.set("tag", e.currentTarget.value)}
            placeholder="my-tag"
            value={filter.get("tag")}
            variant="outlined"
          />
        )}
      </M.Stack>
      <MR.Files.Table
        rows={files.data}
        count={files.count}
        pagination={pagination}
        selection={selection}
        setPagination={setPagination}
        setSelection={setSelection}
        visibility={{
          select: false,
          basename: false,
          dirname: false,
          extname: false,
          channels: false,
          sampleRate: false,
          created_at: true,
        }}
      />
      <M.Stack direction="row" spacing={2}>
        <M.FormControl size="small">
          <M.InputLabel>Output</M.InputLabel>
          <M.Select disabled label="Output" value={String(task.overwrite)}>
            <M.MenuItem value="false" children="Append" />
            <M.MenuItem value="true" children="Overwrite" />
          </M.Select>
        </M.FormControl>
        <M.FormControlLabel
          control={
            <M.Switch checked={task.merge_detections} disabled size="small" />
          }
          label="Merge detections"
        />
        <M.Stack flexGrow={1} />
        <M.Button
          children="Close"
          color="primary"
          onClick={props.onClose}
          variant="outlined"
        />
        <M.Button
          children="Copy"
          color="primary"
          component={RR.Link}
          to={`/tasks/${task.id}/copy`}
          variant="contained"
        />
      </M.Stack>
    </M.Stack>
  )
}
