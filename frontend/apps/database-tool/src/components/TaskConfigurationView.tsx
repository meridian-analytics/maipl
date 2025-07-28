import * as M from "@mui/material"
import * as R from "react"
import type { DatabaseTask } from "../types"

interface TaskConfigurationViewProps {
  task: DatabaseTask
}

export default function TaskConfigurationView({ task }: TaskConfigurationViewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  return (
    <M.Paper sx={{ p: 2 }}>
      <M.Typography variant="h6" gutterBottom>
        Task Configuration
      </M.Typography>
      
      <M.Stack spacing={2}>
        {/* Task Details */}
        <M.Box>
          <M.Typography variant="subtitle2" color="primary" gutterBottom>
            Task Information
          </M.Typography>
          <M.Stack spacing={1}>
            <M.Typography variant="body2">
              <strong>Created:</strong> {formatDate(task.created_at)}
            </M.Typography>
            <M.Typography variant="body2">
              <strong>Last Updated:</strong> {formatDate(task.updated_at)}
            </M.Typography>
            <M.Typography variant="body2">
              <strong>Status:</strong> 
              <M.Chip 
                label={task.status} 
                size="small"
                color={task.status === "completed" ? "success" : 
                       task.status === "failed" ? "error" : 
                       task.status === "in_progress" ? "warning" : "default"}
                sx={{ ml: 1 }}
              />
            </M.Typography>
          </M.Stack>
        </M.Box>

        <M.Divider />

        {/* Database Configuration */}
        <M.Box>
          <M.Typography variant="subtitle2" color="primary" gutterBottom>
            Database Configuration
          </M.Typography>
          <M.Stack spacing={1}>
            <M.Typography variant="body2">
              <strong>Mode:</strong> {task.database_selection.mode === "new_database" ? "New Database" : "Existing Database"}
            </M.Typography>
            {task.database_selection.mode === "use_existing" && task.database_selection.database_file_id && (
              <M.Typography variant="body2">
                <strong>Source Database ID:</strong> {task.database_selection.database_file_id}
              </M.Typography>
            )}
          </M.Stack>
        </M.Box>

        <M.Divider />

        {/* Database File Information */}
        {task.database_file && (
          <M.Box>
            <M.Typography variant="subtitle2" color="primary" gutterBottom>
              Database File
            </M.Typography>
            <M.Stack spacing={1}>
              <M.Typography variant="body2">
                <strong>Filename:</strong> {task.database_file.filename}
              </M.Typography>
              <M.Typography variant="body2">
                <strong>Size:</strong> {formatFileSize(task.database_file.size)}
              </M.Typography>
              <M.Typography variant="body2">
                <strong>Created:</strong> {formatDate(task.database_file.created_at)}
              </M.Typography>
            </M.Stack>
          </M.Box>
        )}

        <M.Divider />

        {/* Output Settings */}
        {task.output_settings && (
          <M.Box>
            <M.Typography variant="subtitle2" color="primary" gutterBottom>
              Output Settings
            </M.Typography>
            <M.Stack spacing={1}>
              <M.Typography variant="body2">
                <strong>Database Filename:</strong> {task.output_settings.database_filename}
              </M.Typography>
              {task.output_settings.seed && (
                <M.Typography variant="body2">
                  <strong>Random Seed:</strong> {task.output_settings.seed}
                </M.Typography>
              )}
            </M.Stack>
          </M.Box>
        )}
      </M.Stack>
    </M.Paper>
  )
} 