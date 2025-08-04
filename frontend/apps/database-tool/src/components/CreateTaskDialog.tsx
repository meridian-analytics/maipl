import * as M from "@mui/material"
import * as R from "react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as RQ from "@tanstack/react-query"
import * as MR from "@maipl/react"
import { File } from "@maipl/api"
import * as API from "@maipl/api"
import type { CreateTaskRequest } from "../types"
import { createDatabaseTaskApi } from "../api/client"
import { getDatabaseMetadata, getExistingGroups } from "../utils/databaseMetadata"

interface CreateTaskDialogProps {
  open: boolean
  onClose: () => void
}

interface TaskFormData extends CreateTaskRequest {
  selectedDatabaseFile?: number
  database_filename: string
}

export default function CreateTaskDialog({ open, onClose }: CreateTaskDialogProps) {
  const queryClient = useQueryClient()
  const maipl = MR.useMaipl()
  const databaseTaskApi = createDatabaseTaskApi(maipl.client)
  const [formData, setFormData] = useState<TaskFormData>({
    task_name: "",
    description: "",
    database_selection: {
      mode: "new_database"
    },
    database_filename: "database.h5"
  })

  // Track selected database metadata
  const [selectedDatabaseMetadata, setSelectedDatabaseMetadata] = useState<{
    file: File.t
    metadata: ReturnType<typeof getDatabaseMetadata>
  } | null>(null)

  // File browser state for existing database selection
  const {
    debouncedFilter,
    filter,
    folder,
    pagination,
    selection,
    setFolder,
    setPagination,
    setSelection,
  } = MR.Files.useTable({
    selection: R.useMemo(
      () => new Map<number, File.t>(),
      []
    ),
    pagination: {
      pageIndex: 0,
      pageSize: 25,
    },
  })

  const { data: databaseFiles } = MR.Files.useQuery({
    maipl_folder: folder,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  // Set folder to h5_databases when switching to existing database mode
  R.useEffect(() => {
    if (formData.database_selection.mode === "use_existing") {
      setFolder(File.t_maipl_folder.h5_databases)
    }
  }, [formData.database_selection.mode, setFolder])

  // Clear selection when folder changes
  R.useEffect(() => {
    setSelection(new Map())
  }, [folder, setSelection])

  // Update selected database metadata when selection changes
  R.useEffect(() => {
    if (selection.size === 1 && formData.database_selection.mode === "use_existing") {
      const selectedFileId = Array.from(selection.keys())[0]
      const selectedFile = databaseFiles?.data.find(f => f.id === selectedFileId)
      
      if (selectedFile) {
        const metadata = getDatabaseMetadata(selectedFile)
        setSelectedDatabaseMetadata({ file: selectedFile, metadata })
        
        // Update form data with selected database file ID
        setFormData(prev => ({
          ...prev,
          database_selection: {
            ...prev.database_selection,
            database_file_id: selectedFile.id
          }
        }))
      }
    } else {
      setSelectedDatabaseMetadata(null)
    }
  }, [selection, databaseFiles?.data, formData.database_selection.mode])

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskFormData) => {
      // Transform the form data to match the API request format
      const request: API.DatabaseTask.t_create_request = {
        task_name: data.task_name,
        description: data.description,
        database_selection: data.database_selection,
        output_settings: {
          database_filename: data.database_filename,
          overwrite: false
        }
      }
      return databaseTaskApi.createTask(request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-tasks'] })
      onClose()
      setFormData({
        task_name: "",
        description: "",
        database_selection: {
          mode: "new_database"
        },
        database_filename: "database.h5"
      })
      setSelection(new Map())
    }
  })

  const generateDefaultFilename = (taskName: string) => {
    if (!taskName.trim()) return "database.h5"
    const sanitized = taskName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .trim()
    return `${sanitized}_database.h5`
  }

  const handleTaskNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTaskName = e.target.value
    setFormData(prev => ({ 
      ...prev, 
      task_name: newTaskName,
      database_filename: generateDefaultFilename(newTaskName)
    }))
  }

  const handleSubmit = (e: R.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    if (formData.database_selection.mode !== "new_database") {
      delete payload.table_name
    }
    createTaskMutation.mutate(payload)
  }

  const handleClose = () => {
    if (!createTaskMutation.isPending) {
      onClose()
      setFormData({
        task_name: "",
        description: "",
        database_selection: {
          mode: "new_database"
        },
        database_filename: "database.h5"
      })
      setSelection(new Map())
    }
  }

  const isFormValid = formData.task_name && formData.database_filename && (
    (formData.database_selection.mode === "new_database") || 
    (formData.database_selection.mode === "use_existing" && selection.size === 1)
  ) && !createTaskMutation.isPending

  return (
    <M.Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <M.DialogTitle>
        Create New Database Task
      </M.DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <M.DialogContent>
          <M.Stack spacing={3}>
            {/* Basic Task Information */}
            <M.TextField
              label="Task Name"
              value={formData.task_name}
              onChange={handleTaskNameChange}
              required
              fullWidth
              placeholder="e.g., Whale Detection Database"
            />
            
            <M.TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
              placeholder="Describe the purpose of this database..."
            />

            <M.TextField
              label="Database Filename"
              value={formData.database_filename}
              onChange={(e) => setFormData(prev => ({ ...prev, database_filename: e.target.value }))}
              required
              fullWidth
              helperText="Name of the output HDF5 database file"
              placeholder="e.g., whale_detection_database.h5"
            />

            {/* Database Selection */}
            <M.FormControl component="fieldset">
              <M.FormLabel component="legend">Database Selection</M.FormLabel>
              <M.RadioGroup
                value={formData.database_selection.mode}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  database_selection: {
                    mode: e.target.value as "new_database" | "use_existing"
                  },
                  // Clear selection when switching modes
                  ...(e.target.value === "use_existing"
                    ? { selectedDatabaseFile: undefined }
                    : {})
                }))}
              >
                <M.FormControlLabel
                  value="new_database"
                  control={<M.Radio />}
                  label="Create New Database"
                />
                <M.FormControlLabel
                  value="use_existing"
                  control={<M.Radio />}
                  label="Use Existing Database"
                />
              </M.RadioGroup>
            </M.FormControl>

            {/* Existing Database Selection */}
            {formData.database_selection.mode === "use_existing" && (
              <>
                <M.Typography variant="h6" gutterBottom>
                  Select Existing Database File
                </M.Typography>
                
                <M.Stack direction="row" spacing={2}>
                  <M.TextField
                    label="Path"
                    onChange={(e) => filter.set("path", e.currentTarget.value)}
                    placeholder="path/to/folder"
                    value={filter.get("path")}
                    size="small"
                  />
                  <M.TextField
                    label="Tag"
                    onChange={(e) => filter.set("tag", e.currentTarget.value)}
                    placeholder="my-tag"
                    value={filter.get("tag")}
                    size="small"
                  />
                </M.Stack>

                <M.Paper sx={{ height: "300px", overflow: "hidden" }}>
                  <MR.Files.Table
                    rows={databaseFiles?.data ?? []}
                    count={databaseFiles?.count ?? 0}
                    pagination={pagination}
                    selection={selection}
                    setPagination={setPagination}
                    setSelection={setSelection}
                    visibility={{
                      basename: false,
                      dirname: false,
                      extname: false,
                      channels: false,
                      sample_rate: false,
                      created_at: true,
                    }}
                  />
                </M.Paper>

                <M.Stack direction="row" justifyContent="space-between" alignItems="center">
                  <M.Typography variant="body2" color="text.secondary">
                    {selection.size > 0 ? (
                      `Selected: ${Array.from(selection.keys()).length} database file${Array.from(selection.keys()).length > 1 ? 's' : ''}`
                    ) : (
                      "No database file selected"
                    )}
                  </M.Typography>
                  
                  {selection.size > 1 && (
                    <M.Alert severity="warning" sx={{ py: 0 }}>
                      Only one database file can be selected
                    </M.Alert>
                  )}
                </M.Stack>

                {/* Display selected database metadata */}
                {selectedDatabaseMetadata && (
                  <M.Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <M.Typography variant="subtitle2" gutterBottom>
                      Selected Database: {selectedDatabaseMetadata.file.basename}
                    </M.Typography>
                    
                    {selectedDatabaseMetadata.metadata ? (
                      <>
                        <M.Typography variant="body2" color="text.secondary" gutterBottom>
                          Existing Groups: {selectedDatabaseMetadata.metadata.groups.length}
                        </M.Typography>
                        
                        {selectedDatabaseMetadata.metadata.groups.length > 0 && (
                          <M.Chip
                            label={`Groups: ${selectedDatabaseMetadata.metadata.groups.join(', ')}`}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                        
                        <M.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                          Total Samples: {selectedDatabaseMetadata.metadata.total_samples || 'Unknown'}
                        </M.Typography>
                      </>
                    ) : (
                      <M.Typography variant="body2" color="text.secondary">
                        No metadata available for this database
                      </M.Typography>
                    )}
                  </M.Paper>
                )}
                
                <M.Alert severity="info">
                  <M.Typography variant="body2">
                    When using an existing database file, the audio representation configuration is already embedded in the file and doesn't need to be selected again.
                  </M.Typography>
                </M.Alert>
              </>
            )}

            {/* Next Steps Info */}
            <M.Alert severity="info">
              <M.Typography variant="body2">
                After creating the task, you'll be able to:
              </M.Typography>
              <M.List dense sx={{ mt: 1 }}>
                {formData.database_selection.mode === "new_database" ? (
                  <>
                    <M.ListItem sx={{ py: 0 }}>
                      <M.ListItemText primary="Select audio files using the file browser" />
                    </M.ListItem>
                    <M.ListItem sx={{ py: 0 }}>
                      <M.ListItemText primary="Add annotation files and label mappings" />
                    </M.ListItem>
                    <M.ListItem sx={{ py: 0 }}>
                      <M.ListItemText primary="Create multiple groups (train/test/validation)" />
                    </M.ListItem>
                    <M.ListItem sx={{ py: 0 }}>
                      <M.ListItemText primary="Generate HDF5 database with embedded audio configuration" />
                    </M.ListItem>
                  </>
                ) : (
                  <>
                    <M.ListItem sx={{ py: 0 }}>
                      <M.ListItemText primary="View existing database structure and groups" />
                    </M.ListItem>
                    <M.ListItem sx={{ py: 0 }}>
                      <M.ListItemText primary="Add new audio files to existing groups" />
                    </M.ListItem>
                    <M.ListItem sx={{ py: 0 }}>
                      <M.ListItemText primary="Add new annotation files and label mappings" />
                    </M.ListItem>
                    <M.ListItem sx={{ py: 0 }}>
                      <M.ListItemText primary="Create additional groups or modify existing ones" />
                    </M.ListItem>
                  </>
                )}
              </M.List>
            </M.Alert>
          </M.Stack>
        </M.DialogContent>

        <M.DialogActions>
          <M.Button onClick={handleClose} disabled={createTaskMutation.isPending}>
            Cancel
          </M.Button>
          <M.Button
            type="submit"
            variant="contained"
            disabled={
              !isFormValid
            }
            startIcon={createTaskMutation.isPending ? <M.CircularProgress size={16} /> : undefined}
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </M.Button>
        </M.DialogActions>
      </form>
    </M.Dialog>
  )
} 