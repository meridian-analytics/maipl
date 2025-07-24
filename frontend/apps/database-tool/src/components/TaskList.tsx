import * as M from "@mui/material"
import * as R from "react"
import type { DatabaseTask } from "../types"

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "primary"
    case "completed":
      return "success"
    case "failed":
      return "error"
    case "in_progress":
      return "warning"
    default:
      return "default"
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "active":
      return "play_circle"
    case "completed":
      return "check_circle"
    case "failed":
      return "error"
    case "in_progress":
      return "hourglass_empty"
    default:
      return "help"
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function TaskList() {
  // TODO: Replace with actual API call
  // const { data: tasks, isLoading, error } = useQuery({
  //   queryKey: ['database-tasks'],
  //   queryFn: () => api.database.getTasks()
  // })

  const tasks = mockTasks
  const isLoading = false
  const error = null

  if (isLoading) {
    return (
      <M.Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <M.CircularProgress />
      </M.Box>
    )
  }

  if (error) {
    return (
      <M.Alert severity="error">
        Failed to load tasks. Please try again.
      </M.Alert>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <M.Paper sx={{ p: 4, textAlign: "center" }}>
        <M.Typography variant="h6" color="text.secondary" gutterBottom>
          No database creation tasks found
        </M.Typography>
        <M.Typography variant="body2" color="text.secondary">
          Create your first database task to get started
        </M.Typography>
      </M.Paper>
    )
  }

  return (
    <M.Stack spacing={2}>
      {tasks.map((task) => (
        <M.Paper key={task.task_id} sx={{ p: 3 }}>
          <M.Stack spacing={2}>
            {/* Task Header */}
            <M.Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <M.Box>
                <M.Typography variant="h6" gutterBottom>
                  {task.task_name}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  {task.description}
                </M.Typography>
              </M.Box>
              
              <M.Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <M.Chip
                  label={task.status.replace('_', ' ')}
                  color={getStatusColor(task.status)}
                  size="small"
                />
              </M.Box>
            </M.Box>

            {/* Task Details */}
            <M.Grid container spacing={2}>
              <M.Grid item xs={12} md={6}>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Database:</strong> {task.database_file.filename}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Size:</strong> {formatFileSize(task.database_file.size)}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Groups:</strong> {task.groups.length}
                </M.Typography>
              </M.Grid>
              <M.Grid item xs={12} md={6}>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Created:</strong> {formatDate(task.created_at)}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Updated:</strong> {formatDate(task.updated_at)}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Total Samples:</strong> {task.groups.reduce((sum, group) => sum + group.statistics.total_samples, 0)}
                </M.Typography>
              </M.Grid>
            </M.Grid>

            {/* Quick Actions */}
            <M.Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <M.Button
                size="small"
                variant="outlined"
              >
                View Details
              </M.Button>
              <M.Button
                size="small"
                variant="outlined"
              >
                Download
              </M.Button>
              <M.Button
                size="small"
                variant="outlined"
                color="error"
              >
                Delete
              </M.Button>
            </M.Box>
          </M.Stack>
        </M.Paper>
      ))}
    </M.Stack>
  )
} 