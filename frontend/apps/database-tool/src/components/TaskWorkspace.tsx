import * as M from "@mui/material"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RQ from "@tanstack/react-query"
import * as MR from "@maipl/react"
import { File } from "@maipl/api"
import type { DatabaseTask, GroupConfig } from "../types"
import { mockApi } from "../api/mockApi"
import TaskConfigurationView from "./TaskConfigurationView"
import AddGroupDialog from "./AddGroupDialog"

export default function TaskWorkspace() {
  const params = RR.useParams()
  const taskId = params.taskId
  const navigate = RR.useNavigate()
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = R.useState(false)
  const { data: task, isLoading, error } = RQ.useQuery({
    queryKey: ['database-tasks', taskId],
    queryFn: () => mockApi.getTask(taskId!),
    enabled: !!taskId
  })
  const queryClient = RQ.useQueryClient()
  const onClose = () => { navigate(-1) }
  const handleAddGroup = () => { setIsAddGroupDialogOpen(true) }
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
          <M.Button variant="contained" onClick={handleAddGroup} disabled={task.status === "completed"}>
            Add Group
          </M.Button>
        </M.Stack>
        <M.Paper sx={{ p: 2 }}>
          <M.Stack direction="row" spacing={2} alignItems="center">
            <M.Typography variant="body1">Status:</M.Typography>
            <M.Chip 
              label={task.status} 
              color={task.status === "completed" ? "success" : 
                     task.status === "failed" ? "error" : 
                     task.status === "in_progress" ? "warning" : "default"}
            />
          </M.Stack>
        </M.Paper>
        <M.Stack direction="row" spacing={3} sx={{ flex: 1 }}>
          <M.Box sx={{ flex: 1 }}>
            <TaskConfigurationView task={task} />
          </M.Box>
          <M.Box sx={{ flex: 1 }}>
            <M.Paper sx={{ p: 2, height: "fit-content" }}>
              <M.Typography variant="h6" gutterBottom>Groups ({task.groups.length})</M.Typography>
              {task.groups.length === 0 ? (
                <M.Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                  <M.Typography variant="body1" color="text.secondary">No groups created yet</M.Typography>
                  <M.Typography variant="body2" color="text.secondary" textAlign="center">Start by adding your first group to the database</M.Typography>
                  <M.Button variant="outlined" onClick={handleAddGroup}>Add First Group</M.Button>
                </M.Stack>
              ) : (
                <M.Stack spacing={1}>
                  {task.groups.map((group) => (
                    <M.Paper key={group.id} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                      <M.Stack direction="row" justifyContent="space-between" alignItems="center">
                        <M.Typography variant="subtitle1">{group.name}</M.Typography>
                        <M.Chip 
                          label={group.status} 
                          size="small"
                          color={group.status === "completed" ? "success" : 
                                 group.status === "failed" ? "error" : 
                                 group.status === "in_progress" ? "warning" : "default"}
                        />
                      </M.Stack>
                      <M.Typography variant="body2" color="text.secondary">
                        {group.statistics.file_count} files, {group.statistics.total_samples} samples
                      </M.Typography>
                    </M.Paper>
                  ))}
                </M.Stack>
              )}
            </M.Paper>
            {task.groups.length > 0 && (
              <M.Paper sx={{ p: 2, mt: 2 }}>
                <M.Typography variant="h6" gutterBottom>Quick Actions</M.Typography>
                <M.Stack direction="row" spacing={2}>
                  <M.Button variant="outlined" disabled={task.status !== "completed"}>Download Database</M.Button>
                  <M.Button variant="outlined" disabled={task.status !== "completed"}>Share Database</M.Button>
                </M.Stack>
              </M.Paper>
            )}
          </M.Box>
        </M.Stack>
        <AddGroupDialog open={isAddGroupDialogOpen} onClose={() => setIsAddGroupDialogOpen(false)} onGroupAdded={handleGroupAdded} task={task} />
      </M.Stack>
    </MR.Modal>
  )
} 