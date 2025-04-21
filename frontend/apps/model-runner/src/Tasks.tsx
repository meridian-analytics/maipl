import { RunnerTask } from "@maipl/api"
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
  tasks: Array<RunnerTask.t>
  deletableTasks: Array<RunnerTask.t>
  isPending?: boolean
}) {
  return (
    <M.Dialog
      open={props.open}
      onClose={props.onClose}
      aria-labelledby="delete-tasks-dialog-title"
      aria-describedby="delete-tasks-dialog-description"
      disableAutoFocus={false}
      disableEnforceFocus={false}
      disableRestoreFocus={false}
      keepMounted={false}
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
                primary={`Task #${task.id}`}
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

function TaskActions(props: { task: RunnerTask.t }) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const [deleteModalOpen, setDeleteModalOpen] = R.useState(false)

  const onDelete = () => {
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deleteMutation.isIdle && (props.task.status === "CREATED" || props.task.status === "FAILURE" || props.task.status === "CANCELLED" || props.task.status === "SUCCESS")) {
      deleteMutation.mutateAsync([maipl.client, props.task.id])
    }
    setDeleteModalOpen(false)
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof RunnerTask.delete>) => {
      return RunnerTask.delete(...vars)
    },
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not delete task #{vars[1]}
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("TaskActions deleteMutation error", err, vars)
      }
    },
    onSettled: () => {
      deleteMutation.reset()
    },
    onSuccess: (_data, vars) => {
      notify(onClose => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Deleted task #{vars[1]}
        </M.Alert>
      ))
      queryClient.invalidateQueries({ queryKey: ["runner-tasks"] })
      queryClient.invalidateQueries({ queryKey: ["runner-tasks", vars[1]] })
    },
  })

  const onStart = () => {
    if (startMutation.isIdle) {
      return startMutation.mutateAsync([maipl.client, props.task.id])
    }
  }

  const startMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof RunnerTask.start>) =>
      RunnerTask.start(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not start task #{vars[1]}
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("Tasks startMutation error", err, vars)
      }
    },
    onSettled: () => {
      startMutation.reset()
      queryClient.refetchQueries({ queryKey: ["runner-tasks"] })
    },
    onSuccess: task => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Started task #{task.id} ...
        </M.Alert>
      ))
    },
  })

  return (
    <>
      <MR.Menu icon={<I.Settings />}>
        <M.MenuItem
          children="Details"
          component={RR.Link}
          to={`/${props.task.id}`}
        />
        <M.MenuItem
          children="Console"
          component={RR.Link}
          to={`/${props.task.id}/console`}
          disabled={props.task.status == "CREATED" || startMutation.isPending}
        />
        <M.MenuItem
          children="Log"
          component={RR.Link}
          to={`/${props.task.id}/log`}
          disabled={props.task.status == "CREATED" || startMutation.isPending}
        />
        <M.MenuItem
          children="Detections"
          component={RR.Link}
          to={`/${props.task.id}/detections`}
          disabled={props.task.status == "CREATED" || startMutation.isPending}
        />
        <M.MenuItem
          disabled={props.task.status != "CREATED" || startMutation.isPending}
          onClick={onStart}
          children="Start"
        />
        <M.MenuItem
          disabled={
            props.task.status != "PENDING" && props.task.status != "STARTED"
          }
          onClick={() => {
            console.warn("TaskActions cancelMutation not implemented")
          }}
          children="Cancel"
        />
        <M.Divider />
        <M.MenuItem
          children="Copy"
          component={RR.Link}
          to={`/${props.task.id}/copy`}
        />
        <M.MenuItem
          disabled={
            props.task.status == "PENDING" ||
            props.task.status == "STARTED" ||
            !(props.task.status === "CREATED" || props.task.status === "FAILURE" || props.task.status === "CANCELLED" || props.task.status === "SUCCESS")
          }
          onClick={onDelete}
          children="Delete"
        />
      </MR.Menu>
      <DeleteTasksDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        tasks={[props.task]}
        deletableTasks={props.task.status === "CREATED" || props.task.status === "FAILURE" || props.task.status === "CANCELLED" || props.task.status === "SUCCESS" ? [props.task] : []}
        isPending={deleteMutation.isPending}
      />
    </>
  )
}

export default function TasksTable(props: {
  sx?: M.SxProps
}) {
  const queryClient = RQ.useQueryClient()
  const { pagination, selection, setPagination, setSelection } =
    MR.RunnerTasks.useTable()
  const [deleteModalOpen, setDeleteModalOpen] = R.useState(false)
  const { data: tasks } = MR.RunnerTasks.useQuery()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const onDeleteSelected = () => {
    if (selection.size === 0) return
    setDeleteModalOpen(true)
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: async (taskIds: number[]) => {
      const deletePromises = taskIds.map(id => RunnerTask.delete(maipl.client, id))
      return Promise.all(deletePromises)
    },
    onError: (err, taskIds) => {
      notify(onClose => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not delete {taskIds.length} task{taskIds.length !== 1 ? 's' : ''}
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("Tasks deleteMutation error", err, taskIds)
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
      // Invalidate both list and individual task queries
      queryClient.invalidateQueries({ queryKey: ["runner-tasks"] })
      taskIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["runner-tasks", id] })
      })
    },
  })

  const handleDeleteConfirm = () => {
    const selectedTasks = tasks?.filter(task => selection.has(task.id)) ?? []
    const deletableTaskIds = selectedTasks
      .filter(task => 
        task.status === "CREATED" || 
        task.status === "FAILURE" || 
        task.status === "CANCELLED" || 
        task.status === "SUCCESS"
      )
      .map(task => task.id)

    if (deleteMutation.isIdle && deletableTaskIds.length > 0) {
      deleteMutation.mutateAsync(deletableTaskIds)
    }
    setDeleteModalOpen(false)
  }

  const selectedTasks = tasks?.filter(task => selection.has(task.id)) ?? []
  const deletableTasks = selectedTasks.filter(task => 
    task.status === "CREATED" || task.status === "FAILURE" || task.status === "CANCELLED" || task.status === "SUCCESS"
  )

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
      <M.Stack direction="row">
        <M.Stack flexGrow={1} />
        <MR.ActionButton
          children={<I.AddCircle />}
          component={RR.Link}
          title="Create Task"
          to="/new"
        />
        <MR.ActionButton
          children={<I.Delete />}
          onClick={onDeleteSelected}
          title="Delete Selected"
          disabled={selection.size === 0}
        />
        <MR.ActionButton
          children={<I.Refresh />}
          onClick={() => {
            queryClient.refetchQueries({ queryKey: ["runner-tasks"] })
          }}
          title="Refresh"
        />
      </M.Stack>
      <MR.RunnerTasks.Table
        columns={[
          MR.RunnerTasks.column.display({
            id: "actions",
            header: "",
            cell: ({ row }) => <TaskActions task={row.original} />,
          }),
        ]}
        rows={tasks}
        count={tasks.length}
        pagination={pagination}
        selection={selection}
        setPagination={setPagination}
        setSelection={setSelection}
        visibility={{
          select: true,
          model_file: false,
          filelist: false,
        }}
      />
      <DeleteTasksDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        tasks={selectedTasks}
        deletableTasks={deletableTasks}
        isPending={deleteMutation.isPending}
      />
    </M.Stack>
  )
}
