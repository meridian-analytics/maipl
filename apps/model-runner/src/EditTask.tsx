import { File, Task } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"

export default function EditTaskLoader() {
  const maipl = MR.useMaipl()
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params.taskId, null)

  const { data: task, error } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["tasks", taskId],
    queryFn: () => {
      return Task.get(maipl.client, taskId!)
    },
  })

  const { data: model, error: modelError } = RQ.useQuery({
    enabled: task != null,
    queryKey: ["files", task?.model_file],
    queryFn: () => {
      return File.get(maipl.client, task?.model_file!)
    },
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
      ) : (
        <EditTask key={task?.id} task={task} model={model} onClose={onClose} />
      )}
    </MR.Modal>
  )
}

function EditTask(props: {
  task?: Task.t
  model?: File.t
  onClose: () => void
}) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const [batchSize, setBatchSize] = R.useState(
    () => props.task?.batch_size ?? 32,
  )
  const [buffer, setBuffer] = R.useState(() => props.task?.buffer ?? 0)
  const [description, setDescription] = R.useState<string>(
    () => props.task?.description ?? "",
  )
  const [modelFile, setModelFile] = R.useState(
    () => props.task?.model_file ?? -1,
  )
  const [stepSize, setStepSize] = R.useState(() => props.task?.step_size ?? 0)
  const [threshold, setThreshold] = R.useState(() => props.task?.threshold ?? 0)

  const { data: models } = MR.Files.useQuery({
    maipl_folder: "model",
    page: 1, // bug: when query changes, page needs to be reset
    size: 100,
  })

  const {
    debouncedFilter,
    filter,
    folder,
    pagination,
    selection,
    setFolder,
    setPagination,
    setSelection,
  } = MR.Files.useTable({
    selection: R.useMemo(
      () =>
        props.task == null
          ? new Map<number, File.t>()
          : new Map(
              props.task.filelist.map(id => [id, true as unknown as File.t]),
            ),
      [props.task],
    ),
  })

  const { data: files } = MR.Files.useQuery({
    maipl_folder: folder,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Task.create>) => {
      return Task.create(...vars)
    },
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not create task
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("EditTask createMutation error", err, vars)
      }
    },
    onSuccess: task => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Created task #{task.id}
        </M.Alert>
      ))
      queryClient.refetchQueries(["tasks"])
      props.onClose()
    },
  })

  const onCreate = () => {
    // todo: validate
    if (modelFile == -1) {
      return notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: No model selected
        </M.Alert>
      ))
    }
    if (selection.size == 0) {
      return notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: No input files selected
        </M.Alert>
      ))
    }
    if (createMutation.isIdle) {
      return createMutation.mutateAsync([
        maipl.client,
        {
          batch_size: batchSize,
          buffer,
          description,
          filelist: Array.from(selection.keys()),
          model_file: modelFile,
          step_size: stepSize,
          threshold,
        },
      ])
    }
  }

  return (
    <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
      <M.Typography variant="h6">
        {props.task == null ? "New Task" : `Copy Task #${props.task.id}`}
      </M.Typography>
      <M.FormControl size="small">
        <M.InputLabel>Model</M.InputLabel>
        <M.Select
          label="Model"
          onChange={e => setModelFile(e.target.value as number)}
          size="small"
          value={modelFile}
          variant="outlined"
        >
          <M.MenuItem value={-1} children="Choose model ..." />
          {models.data
            .sort((a, b) => a.path.localeCompare(b.path))
            .map(m => (
              <M.MenuItem key={m.file} value={m.id}>
                model/{m.path}
              </M.MenuItem>
            ))}
        </M.Select>
      </M.FormControl>
      <M.TextField
        size="small"
        label="Description"
        value={description}
        variant="outlined"
        onChange={e => setDescription(e.target.value)}
      />
      <M.Stack direction="row" spacing={2} justifyContent="space-between">
        <M.TextField
          fullWidth
          size="small"
          label="Batch Size"
          value={batchSize}
          variant="outlined"
          type="number"
          onChange={e => setBatchSize(F.safeParseInteger(e.target.value, 0))}
        />
        <M.TextField
          fullWidth
          size="small"
          label="Step Size"
          value={stepSize}
          variant="outlined"
          type="number"
          onChange={e => setStepSize(F.safeParseInteger(e.target.value, 0))}
        />
        <M.TextField
          fullWidth
          size="small"
          label="Threshold"
          value={threshold}
          variant="outlined"
          type="number"
          onChange={e => setThreshold(F.safeParseNumber(e.target.value, 0))}
        />
        <M.TextField
          fullWidth
          size="small"
          label="Buffer"
          value={buffer}
          variant="outlined"
          type="number"
          onChange={e => setBuffer(F.safeParseNumber(e.target.value, 0))}
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
          children="Create"
          color="primary"
          disabled={createMutation.isLoading}
          onClick={onCreate}
          variant="contained"
        />
        <M.Button
          children="Cancel"
          color="primary"
          disabled={createMutation.isLoading}
          onClick={props.onClose}
          variant="outlined"
        />
      </M.Stack>
    </M.Stack>
  )
}
