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

  return (
    <>
      <M.Paper sx={{ p: 2, height: "fit-content" }}>
        <M.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <M.Typography variant="h6">
            Groups ({(() => {
              const allGroupNames = new Set([
                ...(task.database_metadata?.groups || []),
                ...(task.groups?.map(g => g.name) || [])
              ])
              return allGroupNames.size
            })()}) - Total Samples: {task.database_metadata?.total_samples || 0}
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
        
        {/* Show all groups together */}
        {(!task.database_metadata?.groups || task.database_metadata.groups.length === 0) ? (
          <M.Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <M.Typography variant="body1" color="text.secondary">No groups created yet</M.Typography>
            <M.Typography variant="body2" color="text.secondary" textAlign="center">Start by adding your first group to the database</M.Typography>
            <M.Button variant="outlined" onClick={handleAddGroup}>Add First Group</M.Button>
          </M.Stack>
        ) : (
          <M.Stack spacing={1}>
            {/* Show all groups: existing from database_metadata + newly added from task.groups */}
            {(() => {
              // Get all unique group names from both sources
              const allGroupNames = new Set([
                ...(task.database_metadata?.groups || []),
                ...(task.groups?.map(g => g.name) || [])
              ])
              
              return Array.from(allGroupNames).map((groupPath) => {
                // Check if this group was created by our platform
                const platformGroup = task.groups?.find(g => g.name === groupPath)
                // Check if this group exists in database metadata
                const hasDatabaseMetadata = task.database_metadata?.groups?.includes(groupPath)
                
                return (
                  <M.Paper key={groupPath} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                    <M.Stack direction="row" justifyContent="space-between" alignItems="center">
                      <M.Typography variant="subtitle1">{groupPath}</M.Typography>
                      <M.Stack direction="row" spacing={1} alignItems="center">
                        {platformGroup ? (
                          <M.Chip 
                            label={platformGroup.status} 
                            size="small"
                            color={platformGroup.status === "completed" ? "success" : 
                                   platformGroup.status === "failed" || platformGroup.status === "error" ? "error" : 
                                   platformGroup.status === "in_progress" ? "warning" : "default"}
                          />
                        ) : (
                          <M.Tooltip 
                            title="Group already exists in database (uploaded, generated, or from other tasks)"
                            arrow
                            placement="top"
                          >
                            <M.Chip 
                              label="Existing" 
                              size="small"
                              color="info"
                            />
                          </M.Tooltip>
                        )}
                      </M.Stack>
                    </M.Stack>
                    <M.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                      <M.Typography variant="body2" color="text.secondary">
                        {hasDatabaseMetadata ? (
                          <>
                            {task.database_metadata?.hdf5_structure?.[groupPath]?.samples || 0} samples available
                          </>
                        ) : (
                          "Processing..." // For newly added groups not yet in database metadata
                        )}

                      </M.Typography>
                      {platformGroup && (
                        <GroupActionsMenu
                          group={platformGroup}
                          groupPath={groupPath}
                          taskId={task.id}
                          onViewLog={() => handleViewLog(task.id, platformGroup.id, groupPath)}
                          onViewStats={() => handleViewStats(task.id, platformGroup.id, groupPath)}
                          disabled={platformGroup.status === "in_progress"}
                        />
                      )}
                    </M.Stack>
                  </M.Paper>
                )
              })
            })()}
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
  disabled: boolean
}

function GroupActionsMenu({ group, groupPath, taskId, onViewLog, onViewStats, disabled }: GroupActionsMenuProps) {
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

  return (
    <>
      <M.IconButton
        size="small"
        onClick={handleClick}
        disabled={disabled}
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
        <M.MenuItem onClick={handleViewLog} disabled={disabled}>
          <M.ListItemText>📄 View Log</M.ListItemText>
        </M.MenuItem>
        <M.MenuItem onClick={handleViewStats} disabled={disabled}>
          <M.ListItemText>📊 View Statistics</M.ListItemText>
        </M.MenuItem>
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
  const { data: logData, isLoading, error } = RQ.useQuery({
    queryKey: ['group-log', taskId, groupId],
    queryFn: () => databaseTaskApi.getGroupLog(taskId, groupId),
    enabled: open && !!taskId && !!groupId
  })

  return (
    <MR.Modal onClose={onClose}>
      <M.Stack spacing={3} sx={{ maxWidth: "1000px", maxHeight: "80vh", overflow: "auto" }}>
        <M.Stack direction="row" justifyContent="space-between" alignItems="center">
          <M.Typography variant="h5">Group Log: {groupName}</M.Typography>
          <M.Button onClick={onClose}>Close</M.Button>
        </M.Stack>
        
        {isLoading && (
          <M.Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <M.CircularProgress />
            <M.Typography>Loading log...</M.Typography>
          </M.Stack>
        )}

        {error && (
          <M.Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <M.Typography color="error">Failed to load log</M.Typography>
            <M.Button onClick={onClose}>Close</M.Button>
          </M.Stack>
        )}

        {logData && (
          <>
            <M.Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <M.Stack spacing={1}>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Task ID:</strong> {logData.task_id}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>Group ID:</strong> {logData.group_id}
                </M.Typography>
                <M.Typography variant="body2" color="text.secondary">
                  <strong>File Path:</strong> {logData.file_path}
                </M.Typography>
              </M.Stack>
            </M.Paper>

            <M.Paper sx={{ p: 2 }}>
              <M.Typography variant="h6" gutterBottom>Log Content</M.Typography>
              <M.Box
                component="pre"
                sx={{
                  bgcolor: 'black',
                  color: 'lime',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: '400px',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {logData.log_content}
              </M.Box>
            </M.Paper>
          </>
        )}
      </M.Stack>
    </MR.Modal>
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
