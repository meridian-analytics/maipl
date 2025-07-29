import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import * as R from "react"
import type { DatabaseTask } from "../types"
import { mockApi } from "../api/mockApi"

function DeleteTaskDialog(props: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  task: DatabaseTask
  isPending?: boolean
}) {
  return (
    <M.Dialog
      open={props.open}
      onClose={props.onClose}
      aria-labelledby="delete-task-dialog-title"
      aria-describedby="delete-task-dialog-description"
    >
      <M.DialogTitle id="delete-task-dialog-title">
        Delete Database Task
      </M.DialogTitle>
      <M.DialogContent>
        <M.DialogContentText id="delete-task-dialog-description">
          You are about to delete task "{props.task.task_name}".
          This action cannot be undone.
        </M.DialogContentText>
        <M.List>
          <M.ListItem>
            <M.ListItemText
              primary={`Task: ${props.task.task_name}`}
              secondary={`Database: ${props.task.database_file.filename}`}
            />
          </M.ListItem>
        </M.List>
      </M.DialogContent>
      <M.DialogActions>
        <M.Button onClick={props.onClose}>Cancel</M.Button>
        <M.Button 
          onClick={props.onConfirm} 
          color="error" 
          variant="contained"
          disabled={props.isPending}
        >
          Delete
        </M.Button>
      </M.DialogActions>
    </M.Dialog>
  )
}

export default function TaskActions(props: { task: DatabaseTask }) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const [deleteModalOpen, setDeleteModalOpen] = R.useState(false)

  const onDelete = () => {
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deleteMutation.isIdle) {
      deleteMutation.mutateAsync(props.task.task_id)
    }
    setDeleteModalOpen(false)
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: async (taskId: string) => {
      return mockApi.deleteTask(taskId)
    },
    onError: (err, taskId) => {
      notify(onClose => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not delete task {taskId}
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("TaskActions deleteMutation error", err, taskId)
      }
    },
    onSettled: () => {
      deleteMutation.reset()
    },
    onSuccess: (_data, taskId) => {
      notify(onClose => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Deleted task {taskId}
        </M.Alert>
      ))
      queryClient.invalidateQueries({ queryKey: ['database-tasks'] })
    },
  })

  const onAddGroup = () => {
    // TODO: Navigate to add group page
    console.log("Add group for task:", props.task.task_id)
  }

  const onDownload = () => {
    // TODO: Implement download functionality
    console.log("Download database:", props.task.database_file.filename)
  }

  return (
    <>
      <MR.Menu icon={<I.Settings />}>
        <M.MenuItem
          children="View Details"
          component={RR.Link}
          to={`/${props.task.id}`}
        />
        <M.MenuItem
          children="Download Database"
          onClick={onDownload}
          disabled={props.task.status !== "completed"}
        />
        <M.MenuItem
          disabled={props.task.status === "in_progress"}
          onClick={onDelete}
          children="Delete"
        />
      </MR.Menu>
      <DeleteTaskDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        task={props.task}
        isPending={deleteMutation.isPending}
      />
    </>
  )
} 