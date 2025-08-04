import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import * as R from "react"
import type { DatabaseTask } from "../types"
import { Table, column, useQuery, useTable } from "./DatabaseTasks"
import TaskActions from "./TaskActions"
import CreateTaskButton from "./CreateTaskButton"
import { createDatabaseTaskApi } from "../api/client"

function DeleteTasksDialog(props: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  tasks: Array<DatabaseTask>
  deletableTasks: Array<DatabaseTask>
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
            primary={task.task_name}
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

export default function TasksTable(props: {
  sx?: M.SxProps
}) {
  const queryClient = RQ.useQueryClient()
  const { pagination, selection, setPagination, setSelection } = useTable()
  const [deleteModalOpen, setDeleteModalOpen] = R.useState(false)
  const { data: tasks } = useQuery()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const databaseTaskApi = createDatabaseTaskApi(maipl.client)

  const onDeleteSelected = () => {
    if (selection.size === 0) return
    setDeleteModalOpen(true)
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: async (taskIds: number[]) => {
      // Delete tasks one by one since the API doesn't support bulk delete
      await Promise.all(taskIds.map(id => databaseTaskApi.deleteTask(id)))
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
      queryClient.invalidateQueries({ queryKey: ['database-tasks'] })
    },
  })

  const handleDeleteConfirm = () => {
    const selectedTasks = tasks?.data?.filter(task => selection.has(task.id)) ?? []
    const deletableTaskIds = selectedTasks
      .filter(task => task.status !== "in_progress")
      .map(task => task.id)

    if (deleteMutation.isIdle && deletableTaskIds.length > 0) {
      deleteMutation.mutateAsync(deletableTaskIds)
    }
    setDeleteModalOpen(false)
  }

  const selectedTasks = tasks?.data?.filter(task => selection.has(task.id)) ?? []
  const deletableTasks = selectedTasks.filter(task => task.status !== "in_progress")

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
        <CreateTaskButton />
        <MR.ActionButton
          children={<I.Delete />}
          onClick={onDeleteSelected}
          title="Delete Selected"
          disabled={selection.size === 0}
        />
        <MR.ActionButton
          children={<I.Refresh />}
          onClick={() => {
            queryClient.refetchQueries({ queryKey: ['database-tasks'] })
          }}
          title="Refresh"
        />
      </M.Stack>
      <Table
        columns={[
          column.display({
            id: "actions",
            header: "",
            cell: ({ row }) => <TaskActions task={row.original} />,
          }),
        ]}
        rows={tasks?.data ?? []}
        count={tasks?.count ?? 0}
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
        tasks={selectedTasks}
        deletableTasks={deletableTasks}
        isPending={deleteMutation.isPending}
      />
    </M.Stack>
  )
} 