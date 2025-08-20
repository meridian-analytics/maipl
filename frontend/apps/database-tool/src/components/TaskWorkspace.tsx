import * as M from "@mui/material"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RQ from "@tanstack/react-query"
import * as MR from "@maipl/react"
import { File } from "@maipl/api"
import type { DatabaseTask, GroupConfig } from "../types"
import { createDatabaseTaskApi } from "../api/client"
import TaskConfigurationView from "./TaskConfigurationView"
import Groups from "./Groups"

interface TaskWorkspaceProps {
  taskId?: string
}

export default function TaskWorkspace({ taskId }: TaskWorkspaceProps) {
  const navigate = RR.useNavigate()
  const maipl = MR.useMaipl()
  const databaseTaskApi = createDatabaseTaskApi(maipl.client)
  
  const { data: task, isLoading, error } = RQ.useQuery({
    queryKey: ['database-tasks', taskId],
    queryFn: () => databaseTaskApi.getTask(parseInt(taskId!)),
    enabled: !!taskId
  })
  const queryClient = RQ.useQueryClient()
  const onClose = () => { navigate(-1) }
  const handleGroupAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['database-tasks', taskId] })
  }

  if (isLoading) {
    return (
      <MR.Modal onClose={onClose}>
        <M.Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
          <M.CircularProgress />
          <M.Typography>Loading task details...</M.Typography>
        </M.Stack>
      </MR.Modal>
    )
  }

  if (error || !task) {
    return (
      <MR.Modal onClose={onClose}>
        <M.Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
          <M.Typography color="error">Failed to load task details</M.Typography>
          {error && (
            <M.Typography variant="body2" color="error">
              Error: {error instanceof Error ? error.message : String(error)}
            </M.Typography>
          )}
          <M.Button onClick={onClose}>Close</M.Button>
        </M.Stack>
      </MR.Modal>
    )
  }

  return (
    <MR.Modal onClose={onClose}>
      <M.Stack spacing={3} sx={{ maxWidth: "1200px", maxHeight: "90vh", overflow: "auto" }}>
        <M.Stack direction="row" justifyContent="space-between" alignItems="center">
          <M.Typography variant="h4">{task.task_name}</M.Typography>
        </M.Stack>
        <M.Paper sx={{ p: 2 }}>
          <M.Stack direction="row" spacing={2} alignItems="center">
            <M.Typography variant="body1">Status:</M.Typography>
            <M.Chip 
              label={task.status} 
              color={task.status === "completed" ? "success" : 
                     task.status === "failed" || task.status === "error" ? "error" : 
                     task.status === "in_progress" ? "warning" : "default"}
            />
          </M.Stack>
        </M.Paper>
        <M.Stack direction="row" spacing={3} sx={{ flex: 1 }}>
          <M.Box sx={{ flex: 1 }}>
            <TaskConfigurationView task={task} />
          </M.Box>
          <M.Box sx={{ flex: 1 }}>
            <Groups task={task} onGroupAdded={handleGroupAdded} />
          </M.Box>
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
} 