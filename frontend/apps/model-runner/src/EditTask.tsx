import { File, RunnerTask } from "@maipl/api"
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
  const taskId = F.safeParseInteger(params["taskId"], null)

  const { data: task, error } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["runner-tasks", taskId],
    queryFn: () => {
      return RunnerTask.get(maipl.client, taskId!)
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
  task?: RunnerTask.t
  model?: File.t
  onClose: () => void
}) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const [batchSize, setBatchSize] = R.useState(() => props.task?.parameters?.batch_size ?? 32)
  const [buffer, setBuffer] = R.useState(() => props.task?.parameters?.buffer ?? 0)
  const [description, setDescription] = R.useState<string>(
    () => props.task?.description ?? ""
  )
  const [modelFile, setModelFile] = R.useState(
    () => props.task?.model_file ?? -1
  )
  const [stepSize, setStepSize] = R.useState(() => props.task?.parameters?.step_size ?? 0)
  const [threshold, setThreshold] = R.useState(() => props.task?.parameters?.threshold ?? 0)
  const [tableName, setTableName] = R.useState(() => props.task?.parameters?.table_name ?? "/")
  const [isValidSelection, setIsValidSelection] = R.useState(true)
  const [selectionWarning, setSelectionWarning] = R.useState("")

  const { data: models } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.model,
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
              props.task.filelist.map((id) => [id, true as unknown as File.t])
            ),
      [props.task]
    ),
    pagination: {
      pageIndex: 0,
      pageSize: 25,
    },
  })

  const { data: files } = MR.Files.useQuery({
    maipl_folder: folder,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof RunnerTask.create>) => {
      return RunnerTask.create(...vars)
    },
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not create task
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("EditTask createMutation error", err, vars)
      }
    },
    onSettled: () => {
      createMutation.reset()
    },
    onSuccess: (task) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="success">
          Success: Created task #{task.id}
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["runner-tasks"] })
      props.onClose()
    },
  })

  // Add effect to clear selection when folder changes
  R.useEffect(() => {
    setSelection(new Map())
  }, [folder, setSelection])

  // Add validation effect
  R.useEffect(() => {
    if (selection.size === 0) {
      setIsValidSelection(true)
      setSelectionWarning("")
      return
    }

    const selectedFiles = Array.from(selection.keys())
    const selectedFileTypes = selectedFiles
      .map((id) => {
        const file = files?.data.find((f) => f.id === id)
        return file ? { id, path: file.path, folder: file.maipl_folder } : null
      })
      .filter(Boolean)

    const hasMultipleDatasetFiles =
      selectedFileTypes.filter((f) => f?.folder === File.t_maipl_folder.dataset)
        .length > 1

    if (hasMultipleDatasetFiles) {
      setIsValidSelection(false)
      setSelectionWarning("Only one dataset file can be selected")
    } else {
      setIsValidSelection(true)
      setSelectionWarning("")
    }
  }, [selection, files?.data])

  const onCreate = () => {
    if (createMutation.isIdle) {
      const payload = {
        description,
        filelist: Array.from(selection.keys()),
        model_file: modelFile,
        parameters: {
          batch_size: batchSize,
          buffer,
          step_size: stepSize,
          threshold,
        }
      }

      if (isTableNameEnabled) {
        payload.parameters.table_name = tableName
      }

      return createMutation.mutateAsync([maipl.client, payload])
    }
  }

  // Add helper to check if table name field should be enabled
  const isTableNameEnabled = R.useMemo(() => {
    const selectedFiles = Array.from(selection.keys())
    const h5Files = selectedFiles.filter(
      (id) =>
        files?.data.find((f) => f.id === id)?.maipl_folder ===
        File.t_maipl_folder.dataset
    ).length
    return h5Files === 1
  }, [selection, files?.data])

  return (
    <M.Stack sx={{ height: "80vh", overflow: "hidden" }}>
      <M.Typography variant="h6">
        {props.task == null ? "New Task" : `Copy Task #${props.task.id}`}
      </M.Typography>
      <M.FormControl>
        <M.InputLabel>Model</M.InputLabel>
        <M.Tooltip title="Path to the ketos model file (*.kt)" placement="top">
          <M.Select
            label="Model"
            onChange={(e) => setModelFile(e.target.value as number)}
            value={modelFile}
          >
            <M.MenuItem value={-1} children="Choose model ..." />
            {models.data
              .sort((a, b) => a.path.localeCompare(b.path))
              .map((m) => (
                <M.MenuItem key={m.file} value={m.id}>
                  model/{m.path}
                </M.MenuItem>
              ))}
          </M.Select>
        </M.Tooltip>
      </M.FormControl>
      <M.Tooltip title="Optional description for the task" placement="top">
        <M.TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </M.Tooltip>
      <M.Stack direction="row" justifyContent="space-between">
        <M.Tooltip title="How many samples will be loaded into memory. Lower this number if you are running into out of memory problems." placement="top">
          <M.TextField
            fullWidth
            label="Batch Size"
            value={batchSize}
            type="number"
            onChange={(e) => setBatchSize(F.safeParseInteger(e.target.value, 0))}
          />
        </M.Tooltip>
        <M.Tooltip title="Step size in seconds. If not specified, the step size is set equal to the duration of the audio representation." placement="top">
          <M.TextField
            fullWidth
            label="Step Size"
            value={stepSize}
            type="number"
            onChange={(e) => setStepSize(F.safeParseInteger(e.target.value, 0))}
          />
        </M.Tooltip>
        <M.Tooltip title="The threshold value used to determine the cut-off point for detections. This is a floating-point value between 0 and 1. A detection is considered positive if its score is above this threshold. The default value is 0.5." placement="top">
          <M.TextField
            fullWidth
            label="Threshold"
            value={threshold}
            type="number"
            onChange={(e) => setThreshold(F.safeParseNumber(e.target.value, 0))}
          />
        </M.Tooltip>
        <M.Tooltip title="The buffer duration to be added to each detection in seconds. This helps to extend the start and end times of each detection to include some context around the detected event. The default value is 0.0, which means no buffer is added." placement="top">
          <M.TextField
            fullWidth
            label="Buffer"
            value={buffer}
            type="number"
            onChange={(e) => setBuffer(F.safeParseNumber(e.target.value, 0))}
          />
        </M.Tooltip>
        <M.Tooltip title="Table name within the HDF5 database where the data is stored. Must start with a forward slash. For instance '/test'. If not given, the root '/' path will be used." placement="top">
          <M.TextField
            fullWidth
            label="Table Name"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Enter table name"
            disabled={!isTableNameEnabled}
          />
        </M.Tooltip>
      </M.Stack>
      <M.Typography variant="h6" pt={3}>
        Input Files
      </M.Typography>
      <M.Stack direction="row">
        <MR.Picker
          label="Folder"
          setValue={(value) => {
            if (value) {
              setFolder(value as File.t_maipl_folder)
              // Clear selection when folder changes
              setSelection(new Map())
            }
          }}
          value={folder}
          values={[File.t_maipl_folder.raw, File.t_maipl_folder.dataset]}
        />
        <M.TextField
          label="Path"
          onChange={(e) => filter.set("path", e.currentTarget.value)}
          placeholder="path/to/folder"
          value={filter.get("path")}
        />
        <M.TextField
          label="Tag"
          onChange={(e) => filter.set("tag", e.currentTarget.value)}
          placeholder="my-tag"
          value={filter.get("tag")}
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
      <M.Stack direction="row-reverse">
        <M.Button
          children="Create"
          disabled={
            selection.size == 0 ||
            createMutation.isPending ||
            !isValidSelection ||
            modelFile === -1
          }
          onClick={onCreate}
          variant="contained"
        />
        <M.Button
          children="Cancel"
          disabled={createMutation.isPending}
          onClick={props.onClose}
        />
        <M.Stack flexGrow={1} />
        <M.Stack>
          {selection.size > 0 && (
            <M.Typography color={isValidSelection ? "text.primary" : "error"}>
              {(() => {
                const selectedFiles = Array.from(selection.keys())
                const audioFiles = selectedFiles.filter(
                  (id) =>
                    files?.data.find((f) => f.id === id)?.maipl_folder ===
                    File.t_maipl_folder.raw
                ).length
                const h5Files = selectedFiles.filter(
                  (id) =>
                    files?.data.find((f) => f.id === id)?.maipl_folder ===
                    File.t_maipl_folder.dataset
                ).length

                const parts = []
                if (audioFiles > 0)
                  parts.push(
                    `${audioFiles} audio file${audioFiles > 1 ? "s" : ""}`
                  )
                if (h5Files > 0)
                  parts.push(`${h5Files} dataset file${h5Files > 1 ? "s" : ""}`)

                const fileCount = parts.join(" and ")
                return !isValidSelection
                  ? `${fileCount} - ${selectionWarning}`
                  : fileCount
              })()}
            </M.Typography>
          )}
        </M.Stack>
      </M.Stack>
    </M.Stack>
  )
}
