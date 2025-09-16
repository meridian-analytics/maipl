import { TrainerTask } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import * as R from "react"

function DeleteTasksDialog(props: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  tasks: Array<TrainerTask.t_list_item>
  deletableTasks: Array<TrainerTask.t_list_item>
  isPending?: boolean
}) {
  return (
    <M.Dialog
      open={props.open}
      onClose={props.onClose}
      aria-labelledby="delete-tasks-dialog-title"
      aria-describedby="delete-tasks-dialog-description"
    >
      <M.DialogTitle id="delete-tasks-dialog-title">
        {props.tasks.length === 1 ? "Delete Task" : "Delete Selected Tasks"}
      </M.DialogTitle>
      <M.DialogContent>
        <M.DialogContentText id="delete-tasks-dialog-description">
          You are about to delete {props.deletableTasks.length} task{props.deletableTasks.length !== 1 ? 's' : ''}.
          {props.tasks.length !== props.deletableTasks.length && (
            <M.Typography color="error" variant="body2" sx={{ mt: 1 }}>
              Note: {props.tasks.length - props.deletableTasks.length} task{props.tasks.length - props.deletableTasks.length !== 1 ? 's' : ''} cannot be deleted due to their current status.
            </M.Typography>
          )}
        </M.DialogContentText>
        <M.List>
          {props.deletableTasks.map(task => (
            <M.ListItem key={task.id}>
              <M.ListItemText
                primary={task.name}
                secondary={`Status: ${task.status}`}
              />
            </M.ListItem>
          ))}
        </M.List>
      </M.DialogContent>
      <M.DialogActions>
        <M.Button onClick={props.onClose}>Cancel</M.Button>
        <M.Button
          onClick={props.onConfirm}
          color="error"
          variant="contained"
          disabled={props.deletableTasks.length === 0 || props.isPending}
        >
          Delete
        </M.Button>
      </M.DialogActions>
    </M.Dialog>
  )
}

function TaskActions(props: { task: TrainerTask.t_list_item }) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const onDelete = () => {
    if (
      deleteMutation.isIdle &&
      confirm(`Are you sure you want to delete task #${props.task.id}?`)
    ) {
      return deleteMutation.mutateAsync([maipl.client, props.task.id])
    }
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof TrainerTask.remove>) => {
      return TrainerTask.remove(...vars)
    },
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not delete task #{vars[1]}
        </M.Alert>
      ))
      console.error("TaskActions deleteMutation error", err, vars)
    },
    onSettled: () => {
      deleteMutation.reset()
    },
    onSuccess: (_data, vars) => {
      notify((onClose) => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Deleted task #{vars[1]}
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["trainer_tasks"] })
    },
  })

  const onStart = () => {
    if (startMutation.isIdle) {
      return startMutation.mutateAsync([maipl.client, props.task.id])
    }
  }

  const startMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof TrainerTask.start>) =>
      TrainerTask.start(...vars),
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not start task #{vars[1]}
        </M.Alert>
      ))
      console.error("Tasks startMutation error", err, vars)
    },
    onSettled: () => {
      startMutation.reset()
      queryClient.refetchQueries({ queryKey: ["trainer_tasks"] })
    },
    onSuccess: (task) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="success">
          Success: Started task #{task.id} ...
        </M.Alert>
      ))
    },
  })

  return (
    <MR.Menu icon={<I.Settings />}>
      <M.MenuItem
        children="Details"
        component={RR.Link}
        to={`/${props.task.id}`}
      />
      <M.MenuItem
        children="Console"
        component={RR.Link}
        to={`/console/${props.task.id}`}
      />
      <M.MenuItem
        children="Log"
        component={RR.Link}
        to={`/log/${props.task.id}`}
      />
      <M.MenuItem
        disabled={props.task.status != "CREATED" || startMutation.isPending}
        onClick={onStart}
        children="Start"
      />
      <M.Divider />
      <M.MenuItem
        children="Copy"
        component={RR.Link}
        to={`/${props.task.id}/copy`}
      />
      <M.MenuItem
        disabled={props.task.status == "STARTED" || deleteMutation.isPending}
        onClick={onDelete}
        children="Delete"
      />
    </MR.Menu>
  )
}

const Tasks = (props: { sx?: M.SxProps }) => {
  const queryClient = RQ.useQueryClient()
  const {
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = MR.TrainerTasks.useTable()

  const [pollingEnabled, setPollingEnabled] = R.useState(true)
  const [lastRefreshTime, setLastRefreshTime] = R.useState<Date>(new Date())
  const [deleteModalOpen, setDeleteModalOpen] = R.useState(false)

  const {
    data: tasks,
    isLoading,
    isError,
    error,
  } = MR.TrainerTasks.useQuery({
    size: pagination.pageSize,
    page: pagination.pageIndex + 1,
    // name included only for query key stability; not sent to API
    name: debouncedFilter.get("name"),
    polling: pollingEnabled,
  })

  R.useEffect(() => {
    if (tasks) setLastRefreshTime(new Date())
  }, [tasks])

  const togglePolling = () => {
    setPollingEnabled(!pollingEnabled)
    if (pollingEnabled) {
      queryClient.refetchQueries({ queryKey: ["trainer_tasks", "list"] })
    }
  }

  const onDeleteSelected = () => {
    if (selection.size === 0) return
    setDeleteModalOpen(true)
  }

  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const deleteMutation = RQ.useMutation({
    mutationFn: async (taskIds: number[]) => {
      await Promise.all(taskIds.map(id => TrainerTask.remove(maipl.client, id)))
    },
    onError: (err, taskIds) => {
      notify(onClose => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not delete {taskIds.length} task{taskIds.length !== 1 ? 's' : ''}
        </M.Alert>
      ))
      if ((import.meta as any)?.env?.["DEV"]) {
        console.error("Trainer Tasks deleteMutation error", err, taskIds)
      }
    },
    onSettled: () => {
      deleteMutation.reset()
    },
    onSuccess: (_data, taskIds) => {
      notify(onClose => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Deleted {taskIds.length} task{taskIds.length !== 1 ? 's' : ''}
        </M.Alert>
      ))
      queryClient.invalidateQueries({ queryKey: ["trainer_tasks", "list"] })
    },
  })

  const handleDeleteConfirm = () => {
    const selectedTasks = tasks.data.filter(task => selection.has(task.id))
    const deletableTaskIds = selectedTasks
      .filter(task => task.status !== "STARTED")
      .map(task => task.id)

    if (deleteMutation.isIdle && deletableTaskIds.length > 0) {
      deleteMutation.mutateAsync(deletableTaskIds)
    }
    setDeleteModalOpen(false)
  }

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error: {error.message}</div>

  return (
    <M.Stack
      sx={{
        flexGrow: 1,
        maxHeight: "100%",
        overflow: "hidden",
        padding: 2,
        ...props.sx,
      }}
    >
      <RR.Outlet />
      <M.Stack direction="row" alignItems="center" spacing={2}>
        <M.Stack flexGrow={1} />
        {pollingEnabled && (
          <M.Typography variant="caption" color="text.secondary">
            Auto-refreshing every 5s • Last: {lastRefreshTime.toLocaleTimeString()}
          </M.Typography>
        )}
        <MR.ActionButton
          children={<I.AddCircle />}
          component={RR.Link}
          title="Create Task"
          to="/edit-task"
        />
        <MR.ActionButton
          children={<I.Delete />}
          onClick={onDeleteSelected}
          title="Delete Selected"
          disabled={selection.size === 0}
        />
        <MR.ActionButton
          children={pollingEnabled ? <I.Pause /> : <I.PlayArrow />}
          onClick={togglePolling}
          title={pollingEnabled ? "Disable Auto-refresh" : "Enable Auto-refresh"}
          color={pollingEnabled ? "primary" : "default"}
        />
        <MR.ActionButton
          children={<I.Refresh />}
          onClick={() => {
            queryClient.refetchQueries({ queryKey: ["trainer_tasks", "list"] })
          }}
          title="Refresh"
        />
      </M.Stack>
      <MR.TrainerTasks.Table
        columns={[
          MR.TrainerTasks.column.display({
            id: "actions",
            header: "",
            cell: ({ row }) => <TaskActions task={row.original} />,
          }),
        ]}
        rows={tasks.data}
        count={tasks.count}
        pagination={pagination}
        selection={selection}
        setPagination={setPagination}
        setSelection={setSelection}
        visibility={{
          select: true,
        }}
      />
      <DeleteTasksDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        tasks={tasks.data.filter(task => selection.has(task.id))}
        deletableTasks={tasks.data.filter(task => selection.has(task.id) && task.status !== "STARTED")}
        isPending={deleteMutation.isPending}
      />
    </M.Stack>
  )
}

export default Tasks
