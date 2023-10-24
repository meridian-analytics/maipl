import { File, Task } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"

export default function EditTaskLoader(props: {
  onClose: () => void
}) {
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params.taskId, null)
  const { client } = MR.useMaipl()

  const { data: task, error } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["tasks", taskId],
    queryFn: () => {
      return Task.get(client, taskId!)
    },
  })

  const { data: model, error: modelError } = RQ.useQuery({
    enabled: task != null,
    queryKey: ["files", task?.model_file],
    queryFn: () => {
      return File.get(client, task?.model_file!)
    },
  })

  return (
    <MR.Modal onClose={props.onClose}>
      {error != null ? (
        <M.Typography>{(error as Error).message}</M.Typography>
      ) : modelError != null ? (
        <M.Typography>{(modelError as Error).message}</M.Typography>
      ) : (
        <EditTask task={task} model={model} onClose={props.onClose} />
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
  const { client } = MR.useMaipl()
  const { task } = props
  const [batchSize, setBatchSize] = R.useState(() => task?.batch_size ?? 32)
  const [buffer, setBuffer] = R.useState(() => task?.buffer ?? 0)
  const [description, setDescription] = R.useState<string>(
    () => task?.description ?? "",
  )
  const [modelFile, setModelFile] = R.useState(() => task?.model_file ?? -1)
  const [stepSize, setStepSize] = R.useState(() => task?.step_size ?? 0)
  const [threshold, setThreshold] = R.useState(() => task?.threshold ?? 0)

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
        task == null
          ? new Map<number, File.t>()
          : new Map(task.filelist.map(id => [id, true as unknown as File.t])),
      [task],
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
      // todo: validate
      if (modelFile == -1) {
        throw Error("no model selected")
      }
      if (selection.size == 0) {
        throw Error("no files selected")
      }
      return Task.create(...vars)
    },
    onSuccess: () => {
      queryClient.refetchQueries(["tasks"])
    },
    onError: err => {
      console.log("Model Runner Task Create Error", err)
    },
  })

  const onSave = () => {
    createMutation.mutate([
      client,
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

  return (
    <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
      <M.Typography variant="h6">
        {task == null ? "New Task" : `Copy Task #${task.id}`}
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
          onClick={onSave}
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
