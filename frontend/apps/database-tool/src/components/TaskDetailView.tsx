import * as M from "@mui/material"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RQ from "@tanstack/react-query"
import * as MR from "@maipl/react"
import type { DatabaseTask } from "../types"
import { mockApi } from "../api/mockApi"
import DatabaseStructureView from "./DatabaseStructureView"

export default function TaskDetailView() {
  const params = RR.useParams()
  const taskId = params.taskId
  const navigate = RR.useNavigate()

  const { data: task, isLoading, error } = RQ.useQuery({
    queryKey: ['database-tasks', taskId],
    queryFn: () => mockApi.getTask(taskId!),
    enabled: !!taskId,
  })

  const onClose = () => {
    navigate(-1)
  }

  if (isLoading) {
    return (
      <MR.Modal onClose={onClose}>
        <M.CircularProgress />
      </MR.Modal>
    )
  }

  if (error || !task) {
    return (
      <MR.Modal onClose={onClose}>
        <M.Typography color="error">
          {error ? (error as Error).message : "Task not found"}
        </M.Typography>
      </MR.Modal>
    )
  }

  return (
    <MR.Modal onClose={onClose}>
      <M.Stack spacing={3} sx={{ maxWidth: "800px", maxHeight: "80vh", overflow: "auto" }}>
        <M.Typography variant="h5">
          Task: {task.task_name}
        </M.Typography>

        <M.Paper sx={{ p: 2 }}>
          <M.Typography variant="h6" gutterBottom>
            Task Information
          </M.Typography>
          <M.Stack spacing={1}>
            <M.Typography variant="body2">
              <strong>Description:</strong> {task.description || "No description"}
            </M.Typography>
            <M.Typography variant="body2">
              <strong>Status:</strong> {task.status}
            </M.Typography>
            <M.Typography variant="body2">
              <strong>Created:</strong> {new Date(task.created_at).toLocaleString()}
            </M.Typography>
            <M.Typography variant="body2">
              <strong>Database Mode:</strong> {task.database_selection.mode === "new_database" ? "New Database" : "Existing Database"}
            </M.Typography>
            {task.database_selection.mode === "use_existing" && task.database_selection.database_file_id && (
              <M.Typography variant="body2">
                <strong>Source Database ID:</strong> {task.database_selection.database_file_id}
              </M.Typography>
            )}
          </M.Stack>
        </M.Paper>

        {/* Database Structure View */}
        {task.database_metadata && (
          <DatabaseStructureView task={task} />
        )}

        {/* Groups List */}
        <M.Paper sx={{ p: 2 }}>
          <M.Typography variant="h6" gutterBottom>
            Groups ({task.groups.length})
          </M.Typography>
          
          {task.groups.length === 0 ? (
            <M.Typography variant="body2" color="text.secondary">
              No groups created yet
            </M.Typography>
          ) : (
            <M.Stack spacing={1}>
              {task.groups.map((group) => (
                <M.Card key={group.name} variant="outlined">
                  <M.CardContent>
                    <M.Stack direction="row" justifyContent="space-between" alignItems="center">
                      <M.Typography variant="subtitle1">
                        {group.name}
                      </M.Typography>
                      <M.Chip 
                        label={group.status} 
                        size="small"
                        color={group.status === "completed" ? "success" : 
                               group.status === "failed" ? "error" : 
                               group.status === "in_progress" ? "warning" : "default"}
                      />
                    </M.Stack>
                    
                    <M.Typography variant="body2" color="text.secondary">
                      Source: {group.source === "new_group" ? "New Group" : "Existing Database"}
                    </M.Typography>
                    
                    <M.Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      <M.Typography variant="caption">
                        Files: {group.statistics.file_count}
                      </M.Typography>
                      <M.Typography variant="caption">
                        Labels: {group.statistics.label_count}
                      </M.Typography>
                      <M.Typography variant="caption">
                        Samples: {group.statistics.total_samples}
                      </M.Typography>
                    </M.Stack>
                  </M.CardContent>
                </M.Card>
              ))}
            </M.Stack>
          )}
        </M.Paper>

        <M.Stack direction="row" justifyContent="flex-end">
          <M.Button onClick={onClose} variant="outlined">
            Close
          </M.Button>
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
} 