import * as M from "@mui/material"
import * as R from "react"
import * as RQ from "@tanstack/react-query"
import * as MR from "@maipl/react"
import type { DatabaseTask, DatabaseGroup } from "../types"
import { createDatabaseTaskApi } from "../api/client"
import AddGroupDialog from "./AddGroupDialog"

interface GroupsProps {
  task: DatabaseTask
  onGroupAdded: () => void
}

export default function Groups({ task, onGroupAdded }: GroupsProps) {
  const maipl = MR.useMaipl()
  const databaseTaskApi = createDatabaseTaskApi(maipl.client)
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = R.useState(false)
  const [selectedGroupForLog, setSelectedGroupForLog] = R.useState<{ taskId: number; groupId: number; groupName: string } | null>(null)
  const [selectedGroupForStats, setSelectedGroupForStats] = R.useState<{ taskId: number; groupId: number; groupName: string } | null>(null)

  const handleAddGroup = () => { setIsAddGroupDialogOpen(true) }
  const handleGroupAdded = () => {
    onGroupAdded()
    setIsAddGroupDialogOpen(false)
  }

  const handleViewLog = (taskId: number, groupId: number, groupName: string) => {
    setSelectedGroupForLog({ taskId, groupId, groupName })
  }

  const handleCloseLog = () => {
    setSelectedGroupForLog(null)
  }

  const handleViewStats = (taskId: number, groupId: number, groupName: string) => {
    setSelectedGroupForStats({ taskId, groupId, groupName })
  }

  const handleCloseStats = () => {
    setSelectedGroupForStats(null)
  }

  const handleDeleteGroup = async (groupId: number) => {
    try {
      await databaseTaskApi.deleteGroup(task.id, groupId)
      
      // Check if we should reset task status to active
      // Only reset if task is currently failed/error and no groups are in progress
      const remainingGroups = task.groups?.filter(g => g.id !== groupId) || []
      const hasInProgressGroups = remainingGroups.some(g => g.status === 'in_progress')
      
      if ((task.status === 'failed' || task.status === 'error') && !hasInProgressGroups) {
        try {
          await databaseTaskApi.updateTaskStatus(task.id, { status: 'active' })
        } catch (statusError) {
          console.error('Failed to update task status:', statusError)
          // Don't fail the whole operation if status update fails
        }
      }
      
      // Refresh the task data after deletion
      onGroupAdded()
    } catch (error) {
      console.error('Failed to delete group:', error)
      // TODO: Show error message to user
    }
  }

  return (
    <>
      <M.Paper sx={{ p: 2, height: "fit-content" }}>
        <M.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <M.Typography variant="h6">
            Groups ({task.database_metadata?.groups?.length || 0}) - Total Samples: {task.database_metadata?.total_samples || 0}
            {task.groups && task.groups.length > 0 && (
              <M.Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                ({task.groups.filter(g => g.status === 'completed').length} successful, {task.groups.filter(g => g.status === 'failed' || g.status === 'error').length} failed)
              </M.Typography>
            )}
          </M.Typography>
          <M.Button 
            variant="outlined" 
            onClick={handleAddGroup} 
            disabled={task.status === "in_progress"}
            size="small"
          >
            Add Group
          </M.Button>
        </M.Stack>
        
        {/* Show groups in database first, then processing history */}
        {(!task.database_metadata?.groups || task.database_metadata.groups.length === 0) && (!task.groups || task.groups.length === 0) ? (
          <M.Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <M.Typography variant="body1" color="text.secondary">No groups created yet</M.Typography>
            <M.Typography variant="body2" color="text.secondary" textAlign="center">Start by adding your first group to the database</M.Typography>
            <M.Button variant="outlined" onClick={handleAddGroup}>Add First Group</M.Button>
          </M.Stack>
        ) : (
          <M.Stack spacing={2}>
            {/* Groups in Database (Successfully Processed) */}
            {task.database_metadata?.groups && task.database_metadata.groups.length > 0 && (
              <M.Stack spacing={1}>
                <M.Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                  Groups in Database ({task.database_metadata.groups.length})
                </M.Typography>
                {task.database_metadata.groups.map((groupPath) => {
                  const platformGroup = task.groups?.find(g => g.name === groupPath)
                  return (
                    <M.Paper key={groupPath} sx={{ p: 2, border: 1, borderColor: 'success.main', bgcolor: 'success.50' }}>
                      <M.Stack direction="row" justifyContent="space-between" alignItems="center">
                        <M.Typography variant="subtitle1">{groupPath}</M.Typography>
                        <M.Stack direction="row" spacing={1} alignItems="center">
                          <M.Chip 
                            label="In Database" 
                            size="small"
                            color="success"
                          />
                          {platformGroup && (
                            <M.Chip 
                              label={platformGroup.status} 
                              size="small"
                              color={platformGroup.status === "completed" ? "success" : 
                                     platformGroup.status === "failed" || platformGroup.status === "error" ? "error" : 
                                     platformGroup.status === "in_progress" ? "warning" : "default"}
                            />
                          )}
                        </M.Stack>
                      </M.Stack>
                      <M.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                        <M.Typography variant="body2" color="text.secondary">
                          {task.database_metadata?.hdf5_structure?.[groupPath]?.samples || 0} samples available
                        </M.Typography>
                        {platformGroup && (
                          <GroupActionsMenu
                            group={platformGroup}
                            groupPath={groupPath}
                            taskId={task.id}
                            onViewLog={() => handleViewLog(task.id, platformGroup.id, groupPath)}
                            onViewStats={() => handleViewStats(task.id, platformGroup.id, groupPath)}
                            onDelete={() => handleDeleteGroup(platformGroup.id)}
                          />
                        )}
                      </M.Stack>
                    </M.Paper>
                  )
                })}
              </M.Stack>
            )}

            {/* Processing History (Failed/In Progress Groups) */}
            {task.groups && task.groups.some(g => g.status === 'failed' || g.status === 'error' || g.status === 'in_progress') && (
              <M.Stack spacing={1}>
                <M.Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Processing History
                </M.Typography>
                {task.groups
                  .filter(g => g.status === 'failed' || g.status === 'error' || g.status === 'in_progress')
                  .map((group) => {
                    const isInDatabase = task.database_metadata?.groups?.includes(group.name)
                    return (
                      <M.Paper 
                        key={group.id} 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: group.status === 'failed' || group.status === 'error' ? 'error.main' : 'warning.main',
                          bgcolor: group.status === 'failed' || group.status === 'error' ? 'error.50' : 'warning.50'
                        }}
                      >
                        <M.Stack direction="row" justifyContent="space-between" alignItems="center">
                          <M.Typography variant="subtitle1">{group.name}</M.Typography>
                          <M.Stack direction="row" spacing={1} alignItems="center">
                            <M.Chip 
                              label={group.status} 
                              size="small"
                              color={group.status === "completed" ? "success" : 
                                     group.status === "failed" || group.status === "error" ? "error" : 
                                     group.status === "in_progress" ? "warning" : "default"}
                            />
                            {isInDatabase && (
                              <M.Chip 
                                label="Also in Database" 
                                size="small"
                                color="info"
                              />
                            )}
                          </M.Stack>
                        </M.Stack>
                        <M.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                          <M.Typography variant="body2" color="text.secondary">
                            {group.status === 'failed' || group.status === 'error' ? 
                              'Failed to process - not added to database' : 
                              'Processing...'}
                          </M.Typography>
                          <GroupActionsMenu
                            group={group}
                            groupPath={group.name}
                            taskId={task.id}
                            onViewLog={() => handleViewLog(task.id, group.id, group.name)}
                            onViewStats={() => handleViewStats(task.id, group.id, group.name)}
                            onDelete={() => handleDeleteGroup(group.id)}
                          />
                        </M.Stack>
                      </M.Paper>
                    )
                  })}
              </M.Stack>
            )}
          </M.Stack>
        )}
      </M.Paper>



      <AddGroupDialog 
        open={isAddGroupDialogOpen} 
        onClose={() => setIsAddGroupDialogOpen(false)} 
        onGroupAdded={handleGroupAdded} 
        task={task} 
      />

      {/* Group Log Modal */}
      {selectedGroupForLog && (
        <GroupLogModal
          open={!!selectedGroupForLog}
          onClose={handleCloseLog}
          taskId={selectedGroupForLog.taskId}
          groupId={selectedGroupForLog.groupId}
          groupName={selectedGroupForLog.groupName}
          databaseTaskApi={databaseTaskApi}
        />
      )}

      {/* Group Statistics Modal */}
      {selectedGroupForStats && (
        <GroupStatsModal
          open={!!selectedGroupForStats}
          onClose={handleCloseStats}
          taskId={selectedGroupForStats.taskId}
          groupId={selectedGroupForStats.groupId}
          groupName={selectedGroupForStats.groupName}
          databaseTaskApi={databaseTaskApi}
        />
      )}
    </>
  )
}

interface GroupActionsMenuProps {
  group: DatabaseGroup
  groupPath: string
  taskId: number
  onViewLog: () => void
  onViewStats: () => void
  onDelete?: () => void
}

function GroupActionsMenu({ group, groupPath, taskId, onViewLog, onViewStats, onDelete }: GroupActionsMenuProps) {
  const [anchorEl, setAnchorEl] = R.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: R.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleViewLog = () => {
    onViewLog()
    handleClose()
  }

  const handleViewStats = () => {
    onViewStats()
    handleClose()
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    }
    handleClose()
  }

  return (
    <>
      <M.IconButton
        size="small"
        onClick={handleClick}
        sx={{ color: 'text.secondary' }}
      >
        ⋮
      </M.IconButton>
      <M.Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <M.MenuItem onClick={handleViewLog}>
          <M.ListItemText>📄 View Log</M.ListItemText>
        </M.MenuItem>
        {group.status === 'completed' && (
          <M.MenuItem onClick={handleViewStats}>
            <M.ListItemText>📊 View Statistics</M.ListItemText>
          </M.MenuItem>
        )}
        {onDelete && (group.status === 'failed' || group.status === 'error') && (
          <M.MenuItem onClick={handleDelete}>
            <M.ListItemText>🗑️ Delete Group</M.ListItemText>
          </M.MenuItem>
        )}
      </M.Menu>
    </>
  )
}

interface GroupLogModalProps {
  open: boolean
  onClose: () => void
  taskId: number
  groupId: number
  groupName: string
  databaseTaskApi: ReturnType<typeof createDatabaseTaskApi>
}

function GroupLogModal({ open, onClose, taskId, groupId, groupName, databaseTaskApi }: GroupLogModalProps) {
  const queryClient = RQ.useQueryClient()
  const { data: logData, isLoading, error } = RQ.useQuery({
    queryKey: ['group-log', taskId, groupId],
    queryFn: () => databaseTaskApi.getGroupLog(taskId, groupId),
    enabled: open && !!taskId && !!groupId
  })

  return (
    <MR.Terminal
      consoleOutput={logData?.log_content || ''}
      onClose={onClose}
      onRefresh={() => queryClient.refetchQueries({ queryKey: ['group-log', taskId, groupId] })}
      isLoading={isLoading}
      error={(error as Error) || null}
    />
  )
}

interface GroupStatsModalProps {
  open: boolean
  onClose: () => void
  taskId: number
  groupId: number
  groupName: string
  databaseTaskApi: ReturnType<typeof createDatabaseTaskApi>
}

function GroupStatsModal({ open, onClose, taskId, groupId, groupName, databaseTaskApi }: GroupStatsModalProps) {
  const { data: group, isLoading, error } = RQ.useQuery({
    queryKey: ['group', taskId, groupId],
    queryFn: () => databaseTaskApi.getGroup(taskId, groupId),
    enabled: open && !!taskId && !!groupId
  })

  return (
    <MR.Modal onClose={onClose}>
      <M.Stack spacing={3} sx={{ maxWidth: "800px", maxHeight: "80vh", overflow: "auto" }}>
        <M.Stack direction="row" justifyContent="space-between" alignItems="center">
          <M.Typography variant="h5">Group Statistics: {groupName}</M.Typography>
          <M.Button onClick={onClose}>Close</M.Button>
        </M.Stack>
        
        {isLoading && (
          <M.Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <M.CircularProgress />
            <M.Typography>Loading statistics...</M.Typography>
          </M.Stack>
        )}

        {error && (
          <M.Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <M.Typography color="error">Failed to load statistics</M.Typography>
            <M.Button onClick={onClose}>Close</M.Button>
          </M.Stack>
        )}

        {group && (
          <>
            <M.Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <M.Stack spacing={1}>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Group ID:</strong> {group.id}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> {group.statistics.status}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Source:</strong> {group.source}
                </M.Typography>
              </M.Stack>
            </M.Paper>

            <M.Paper sx={{ p: 2 }}>
              <M.Typography variant="h6" gutterBottom>Processing Statistics</M.Typography>
              <M.Stack spacing={2}>
                <M.Stack direction="row" justifyContent="space-between">
                  <M.Typography>Total Samples:</M.Typography>
                  <M.Typography variant="body2">{group.statistics.total_samples}</M.Typography>
                </M.Stack>
                <M.Stack direction="row" justifyContent="space-between">
                  <M.Typography>Processed Files:</M.Typography>
                  <M.Typography variant="body2">{group.statistics.processed_files}</M.Typography>
                </M.Stack>
                <M.Stack direction="row" justifyContent="space-between">
                  <M.Typography>Processing Time:</M.Typography>
                  <M.Typography variant="body2">{group.statistics.processing_time.toFixed(2)}s</M.Typography>
                </M.Stack>
                <M.Stack direction="row" justifyContent="space-between">
                  <M.Typography>File Size:</M.Typography>
                  <M.Typography variant="body2">{(group.statistics.file_size / 1024 / 1024).toFixed(2)} MB</M.Typography>
                </M.Stack>
                <M.Stack direction="row" justifyContent="space-between">
                  <M.Typography>Processed At:</M.Typography>
                  <M.Typography variant="body2">{new Date(group.statistics.processed_at).toLocaleString()}</M.Typography>
                </M.Stack>
              </M.Stack>
            </M.Paper>
          </>
        )}
      </M.Stack>
    </MR.Modal>
  )
}
