import { File, Task } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"

export default function ShowTaskLoader() {
  const maipl = MR.useMaipl()
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params.taskId, null)

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
        <ShowTask key={task.id} task={task} model={model} onClose={onClose} />
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
        <M.TextField
          size="small"
          label="Path"
          onChange={e => filter.set("path", e.currentTarget.value)}
          placeholder="path/to/folder"
          value={filter.get("path")}
          variant="outlined"
        />
        <M.TextField
          size="small"
          label="Tag"
          onChange={e => filter.set("tag", e.currentTarget.value)}
          placeholder="my-tag"
          value={filter.get("tag")}
          variant="outlined"
        />
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
          sample_rate: false,
          created_at: true,
        }}
      />
      <M.Stack direction="row-reverse" spacing={2}>
        <M.Button
          children="Copy"
          color="primary"
          component={RR.Link}
          to={`/${task.id}/copy`}
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
