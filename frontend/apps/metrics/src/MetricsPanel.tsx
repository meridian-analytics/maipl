import { File, Metrics } from "@maipl/api"
import * as M from "@mui/material"
import * as MR from "@maipl/react"
import * as R from "react"
import * as RQ from "@tanstack/react-query"
import Task from "./Task"

const optionsInit = {
  threshold_min: 0.0,
  threshold_max: 1.0,
  threshold_inc: 0.05,
  total_time_units: 0,
}

const textFieldStyle = { width: "120px" }
const fileSelectStyle = { width: "100%" }

export default function MetricsPanel() {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const [refFile, setRefFile] = R.useState<number>(-1)
  const [evalFile, setEvalFile] = R.useState<number>(-1)
  const [isClip, setIsClip] = R.useState<boolean>(true)
  const [options, setOptions] = R.useState(optionsInit)
  const [output, setOutput] = R.useState<string>("output")
  const [addRef, setAddRef] = R.useState<boolean>(false)
  const [isCooldown, setIsCooldown] = R.useState(false)
  const [cooldownTime, setCooldownTime] = R.useState(0)
  const [newTaskId, setNewTaskId] = R.useState<number | null>(null)

  const {
    debouncedFilter,
    filter,
    folder,
    pagination,
    selection,
    setFolder,
    setPagination,
    setSelection,
  } = MR.Files.useTable()

  // Load models
  const { data: annotations } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.annotations,
    page: 1,
    size: 100,
  })

  const { data: files } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.audio_files,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  const { data: tasks } = MR.MetricTasks.useQuery({
    ordering: "-created_at",
  })

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Metrics.create>) => {
      return Metrics.create(...vars)
    },
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity='error'>
          Error: Could not process metrics
        </M.Alert>
      ))
    },
    onSettled: () => {
      createMutation.reset()
    },
    onSuccess: (metric) => {
      setNewTaskId(metric.id)
      notify((onClose) => (
        <M.Alert onClose={onClose} severity='success'>
          Success: Processed metrics #{metric.id}
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["metrics"] })
    },
  })

  const onSubmit = () => {
    if (createMutation.isIdle) {
      setIsCooldown(true)
      setCooldownTime(5)
      return createMutation.mutateAsync([
        maipl.client,
        {
          ref_file: refFile,
          eval_file: evalFile,
          folder: output,
          parameters: {
            type: isClip ? "clips" : "continuous",
            add_ref: addRef,
            ...options
          },
        },
      ])
    }
  }

  R.useEffect(() => {
    let timer: NodeJS.Timeout
    if (isCooldown && cooldownTime > 0) {
      timer = setTimeout(() => {
        setCooldownTime(cooldownTime - 1)
      }, 1000)
    } else if (cooldownTime === 0) {
      setIsCooldown(false)
    }
    return () => {
      clearTimeout(timer)
    }
  }, [isCooldown, cooldownTime])

  // Reset newTaskId after animation completes
  R.useEffect(() => {
    if (newTaskId) {
      const timer = setTimeout(() => {
        setNewTaskId(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [newTaskId])

  // Refresh metrics every 10 seconds
  R.useEffect(() => {
    const interval = setInterval(() => {
      queryClient.refetchQueries({ queryKey: ["metrics"] })
    }, 10000)

    return () => clearInterval(interval)
  }, [queryClient])


  return (
    <M.Stack
      id='container'
      direction='row'
      spacing={2}
      sx={{
        height: "100vh",
        overflow: "hidden",
        padding: 2,
      }}
    >
      <M.Stack
        id='metrics-panel-container'
        sx={{
          flexBasis: "60%",
          maxHeight: "100%",
          overflow: "hidden",
          paddingTop: 1,
        }}
      >
        <M.Stack style={fileSelectStyle}>
          {/* file select section */}
          <M.FormControl required>
            <M.InputLabel>Evaluation</M.InputLabel>
            <M.Select
              label='Model'
              onChange={(e) => setEvalFile(e.target.value as number)}
              value={evalFile}
            >
              <M.MenuItem value={-1} children='Choose evaluation ...' />
              {annotations.data
                .sort((a, b) => a.path.localeCompare(b.path))
                .map((m) => (
                  <M.MenuItem key={m.file} value={m.id}>
                    {m.path}
                  </M.MenuItem>
                ))}
            </M.Select>
          </M.FormControl>
          <M.FormControl required>
            <M.InputLabel>Reference</M.InputLabel>
            <M.Select
              label='Model'
              onChange={(e) => setRefFile(e.target.value as number)}
              value={refFile}
            >
              <M.MenuItem value={-1} children='Choose evaluation ...' />
              {annotations.data
                .sort((a, b) => a.path.localeCompare(b.path))
                .map((m) => (
                  <M.MenuItem key={m.file} value={m.id}>
                    {m.path}
                  </M.MenuItem>
                ))}
            </M.Select>
          </M.FormControl>
        </M.Stack>
        <M.Stack direction='row'>
          {/* options section */}
          <M.TextField
            label='Output Folder'
            onChange={(e) => setOutput(e.target.value)}
            value={output}
            required
            style={textFieldStyle}
          />
          <M.TextField
            label='Threshold min'
            onChange={(e) =>
              setOptions({ ...options, threshold_min: e.target.value })
            }
            type='number'
            value={options.threshold_min}
            style={textFieldStyle}
          />
          <M.TextField
            label='Threshold max'
            onChange={(e) =>
              setOptions({ ...options, threshold_max: e.target.value })
            }
            type='number'
            value={options.threshold_max}
            style={textFieldStyle}
          />
          <M.TextField
            label='Threshold inc'
            onChange={(e) =>
              setOptions({ ...options, threshold_inc: e.target.value })
            }
            type='number'
            value={options.threshold_inc}
            style={textFieldStyle}
          />
          <M.TextField
            label='Total time units'
            onChange={(e) =>
              setOptions({ ...options, total_time_units: e.target.value })
            }
            type='number'
            value={options.total_time_units}
            style={textFieldStyle}
          />
          <M.FormControlLabel
            style={textFieldStyle}
            control={
              <M.Switch
                checked={isClip}
                onChange={(e) => setIsClip(e.target.checked)}
                name='clips'
              />
            }
            label={isClip ? "Clips" : "Continuous"}
          />
          <M.Button
            children={isCooldown ? `Submit (${cooldownTime}s)` : "Submit"}
            disabled={
              refFile === -1 || evalFile === -1 || output === "" || isCooldown
            }
            onClick={onSubmit}
            variant='contained'
            style={textFieldStyle}
          />
        </M.Stack>
        <M.Divider />
        <M.Stack>
          <M.Stack direction='row' height='30px'>
            <M.FormControlLabel
              control={
                <M.Switch
                  checked={addRef}
                  onChange={(e) => setAddRef(e.target.checked)}
                  name='addRef'
                />
              }
              label='Add background reference'
            />
            {addRef && (
              <M.TextField
                label='Filter by Path ...'
                onChange={(e) => filter.set("path", e.currentTarget.value)}
                value={filter.get("path")}
              />
            )}
            {addRef && (
              <M.TextField
                label='Filber by Tag ...'
                onChange={(e) => filter.set("tag", e.currentTarget.value)}
                value={filter.get("tag")}
              />
            )}
          </M.Stack>
          {addRef && (
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
          )}
        </M.Stack>
      </M.Stack>
      <M.Stack
        id='task-history-container'
        sx={{
          paddingTop: 1,
          flexBasis: "40%",
          maxHeight: "100%",
          overflow: "auto",
        }}
      >
        {tasks.map((task) => (
          <Task 
            key={task.id} 
            task={task}
            isNew={task.id === newTaskId}
          />
        ))}
      </M.Stack>
    </M.Stack>
  )
}
