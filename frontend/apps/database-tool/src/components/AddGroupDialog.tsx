import * as M from "@mui/material"
import * as R from "react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as RQ from "@tanstack/react-query"
import * as MR from "@maipl/react"
import { File } from "@maipl/api"
import * as API from "@maipl/api"
import type { DatabaseTask } from "../types"
import { createDatabaseTaskApi } from "../api/client"
import { validateGroupName, trimGroupName } from "../utils/databaseMetadata"

enum Tab {
  audio_files = "audio_files",
  annotation_config = "annotation_config",
  random_selection = "random_selection"
}

interface AddGroupDialogProps {
  open: boolean
  onClose: () => void
  onGroupAdded: () => void
  task: DatabaseTask
}

interface GroupFormData {
  name: string
  audio_file_ids: number[]
  audio_representation_config_id: number
  annotations?: {
    file_id: number
    labels: Record<string, number>
    annotation_step: number
    step_min_overlap: number
    only_augmented: boolean
  }
  random_selections?: {
    num_samples: number | "same"
    label: number
    filename_filter_file_id?: number
    seed?: number
  }
  avoid_annotations_file_id?: number
}

export default function AddGroupDialog({ open, onClose, onGroupAdded, task }: AddGroupDialogProps) {
  const queryClient = useQueryClient()
  const maipl = MR.useMaipl()
  const databaseTaskApi = createDatabaseTaskApi(maipl.client)
  const [activeTab, setActiveTab] = useState<Tab>(Tab.audio_files)
  const [formData, setFormData] = useState<GroupFormData>({
    name: "",
    audio_file_ids: [],
    audio_representation_config_id: 0,
    annotations: {
      file_id: 0,
      labels: {},
      annotation_step: 0.5,
      step_min_overlap: 0.7,
      only_augmented: false
    },
    random_selections: {
      num_samples: 100,
      label: 0
    }
  })

  // File browser state for audio files
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
    selection: R.useMemo(() => new Map<number, File.t>(), []),
    pagination: {
      pageIndex: 0,
      pageSize: 25,
    },
  })

  const { data: audioFiles } = MR.Files.useQuery({
    maipl_folder: folder,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  // File browser state for annotation files
  const {
    debouncedFilter: annotationFilter,
    filter: annotationFilterState,
    folder: annotationFolder,
    pagination: annotationPagination,
    selection: annotationSelection,
    setFolder: setAnnotationFolder,
    setPagination: setAnnotationPagination,
    setSelection: setAnnotationSelection,
  } = MR.Files.useTable({
    selection: R.useMemo(() => new Map<number, File.t>(), []),
    pagination: {
      pageIndex: 0,
      pageSize: 25,
    },
  })

  const { data: annotationFiles } = MR.Files.useQuery({
    maipl_folder: annotationFolder,
    path: annotationFilter.get("path"),
    tag: annotationFilter.get("tag"),
    page: annotationPagination.pageIndex + 1,
    size: annotationPagination.pageSize,
  })

  // Fetch audio configuration files
  const { data: audioConfigFiles } = RQ.useQuery({
    queryKey: ["files", File.t_maipl_folder.audio_configs],
    queryFn: () =>
      File.list(maipl.client, {
        maipl_folder: File.t_maipl_folder.audio_configs,
        page: 1,
        size: 100,
      }).then((page) => new Map(page.data.map((f) => [f.id, f]))),
    initialData: new Map<number, File.t>(),
  })



  // Set folder to audio_files when dialog opens
  R.useEffect(() => {
    if (open) {
      setFolder(File.t_maipl_folder.audio_files)
      setAnnotationFolder(File.t_maipl_folder.annotations)
    }
  }, [open, setFolder, setAnnotationFolder])

  // Clear selection when folder changes
  R.useEffect(() => {
    setSelection(new Map())
  }, [folder, setSelection])

  R.useEffect(() => {
    setAnnotationSelection(new Map())
  }, [annotationFolder, setAnnotationSelection])

  // Update form data when selection changes
  R.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      audio_file_ids: Array.from(selection.keys())
    }))
  }, [selection])

  R.useEffect(() => {
    if (annotationSelection.size === 1) {
      const selectedAnnotationId = Array.from(annotationSelection.keys())[0]
      setFormData(prev => ({
        ...prev,
        annotations: {
          ...prev.annotations,
          file_id: selectedAnnotationId
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        annotations: prev.annotations ? { ...prev.annotations, file_id: 0 } : undefined
      }))
    }
  }, [annotationSelection])

  // Handle processing mode selection
  const handleProcessingModeChange = (mode: "annotations" | "random" | "none") => {
    if (mode === "annotations") {
      setFormData(prev => ({
        ...prev,
        annotations: {
          file_id: 0,
          labels: {},
          annotation_step: 0.5,
          step_min_overlap: 0.7,
          only_augmented: false
        },
        random_selections: undefined
      }))
      setActiveTab(Tab.annotation_config)
    } else if (mode === "random") {
      setFormData(prev => ({
        ...prev,
        annotations: undefined,
        random_selections: {
          num_samples: 100,
          label: 0
        }
      }))
      setActiveTab(Tab.random_selection)
    } else {
      setFormData(prev => ({
        ...prev,
        annotations: undefined,
        random_selections: undefined
      }))
      setActiveTab(Tab.audio_files)
    }
  }

  // Handle switch toggle between annotation and random modes
  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const useAnnotations = event.target.checked
    if (useAnnotations) {
      handleProcessingModeChange("annotations")
    } else {
      handleProcessingModeChange("random")
    }
  }

  const addGroupMutation = useMutation({
    mutationFn: (data: GroupFormData) => {
      // Transform the form data to match the API request format
      const request: API.DatabaseTask.t_group_create_request = {
        name: data.name,
        source: "new_group",
        config: {
          audio_file_ids: data.audio_file_ids,
          audio_representation_config_id: data.audio_representation_config_id,
          annotations: data.annotations,
          random_selections: data.random_selections,
          avoid_annotations_file_id: data.avoid_annotations_file_id
        }
      }
      console.log('Creating group with request:', request)
      console.log('Task ID:', task.id)
      return databaseTaskApi.createGroup(task.id, request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-tasks', task.id] })
      onGroupAdded()
      setFormData({
        name: "",
        audio_file_ids: [],
        audio_representation_config_id: 0,
        annotations: {
          file_id: 0,
          labels: {},
          annotation_step: 0.5,
          step_min_overlap: 0.7,
          only_augmented: false
        },
        random_selections: {
          num_samples: 100,
          label: 0
        }
      })
      setSelection(new Map())
      setAnnotationSelection(new Map())
      setActiveTab(Tab.audio_files)
      onClose() // Close the dialog after successful group creation
    },
    onError: (error) => {
      console.error('Add group error:', error)
    }
  })

  const handleSubmit = (e: R.FormEvent) => {
    e.preventDefault()
    
    // Use trimmed group name
    const trimmedName = trimGroupName(formData.name)
    const groupConfigWithTrimmedName = {
      ...formData,
      name: trimmedName
    }
    
    addGroupMutation.mutate(groupConfigWithTrimmedName)
  }

  const handleClose = () => {
    if (!addGroupMutation.isPending) {
      onClose()
      setFormData({
        name: "",
        audio_file_ids: [],
        audio_representation_config_id: 0,
        annotations: {
          file_id: 0,
          labels: {},
          annotation_step: 0.5,
          step_min_overlap: 0.7,
          only_augmented: false
        },
        random_selections: {
          num_samples: 100,
          label: 0
        }
      })
      setSelection(new Map())
      setAnnotationSelection(new Map())
      setActiveTab(Tab.audio_files)
    }
  }

  // Determine processing mode - default to random mode initially
  const processingMode = (formData.annotations?.file_id && formData.annotations.file_id > 0) ? "annotations" : "random"
  const isAnnotationMode = processingMode === "annotations"

  // Validation
  const existingGroups = task.groups?.map(group => group.name) || []
  const nameValidation = validateGroupName(formData.name, existingGroups)
  const hasAudioFiles = formData.audio_file_ids.length > 0
  const hasAudioConfig = formData.audio_representation_config_id > 0
  
  // We always need audio files, audio config, and the specific configuration for the selected mode
  const isFormValid = nameValidation.isValid && hasAudioFiles && hasAudioConfig && (
    (processingMode === "annotations" && formData.annotations?.file_id && formData.annotations.file_id > 0) ||
    (processingMode === "random" && formData.random_selections?.num_samples && 
     (formData.random_selections.num_samples === "same" || 
      (typeof formData.random_selections.num_samples === "number" && formData.random_selections.num_samples > 0)) &&
     formData.random_selections?.label !== undefined && formData.random_selections.label >= 0)
  )
  


  return (
    <M.Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <M.DialogTitle>Add New Group</M.DialogTitle>
      <form onSubmit={handleSubmit}>
        <M.DialogContent>
          <M.Stack spacing={3}>
            <M.Stack direction="row" spacing={2} alignItems="flex-start">
              <M.TextField
                label="Group Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                fullWidth
                error={!nameValidation.isValid}
                helperText={nameValidation.error || "Enter a unique name for this group (e.g., '/train', '/test', '/train/sub/dec')"}
                placeholder="e.g., /train, /test, /train/sub/dec"
              />
              <M.Box sx={{ pt: 2 }}>
                <M.FormControlLabel
                  control={
                    <M.Switch
                      checked={isAnnotationMode}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label={isAnnotationMode ? "Annotation Config" : "Random Selection"}
                  labelPlacement="start"
                />
              </M.Box>
            </M.Stack>

            <M.TextField
              label="Audio Representation Configuration"
              value={formData.audio_representation_config_id ? String(formData.audio_representation_config_id) : ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                audio_representation_config_id: Number(e.target.value) 
              }))}
              select
              required
              fullWidth
              helperText="Select the audio configuration for this group"
            >
              <M.MenuItem value="">
                <M.Typography color="text.secondary">Select audio configuration...</M.Typography>
              </M.MenuItem>
              {Array.from(audioConfigFiles?.values() || []).map((file) => (
                <M.MenuItem key={file.id} value={file.id}>
                  {`${file.maipl_folder}/${file.path}`}
                </M.MenuItem>
              ))}
            </M.TextField>

            {audioConfigFiles?.size === 0 && (
              <M.Alert severity="info">
                <M.Typography variant="body2">
                  No audio configuration files found. Please upload audio configuration files to the "audio configs" folder first.
                </M.Typography>
              </M.Alert>
            )}

            {/* Tabs */}
            <M.Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <M.Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <M.Tab 
                  label="Audio Files" 
                  value={Tab.audio_files}
                />
                <M.Tab 
                  label="Annotation Configuration" 
                  value={Tab.annotation_config}
                  disabled={!isAnnotationMode}
                />
                <M.Tab 
                  label="Random Selection" 
                  value={Tab.random_selection}
                  disabled={isAnnotationMode}
                />
              </M.Tabs>
            </M.Box>

            {/* Tab Content */}
            <M.Box sx={{ minHeight: "400px" }}>
              {/* Audio Files Tab */}
              {activeTab === Tab.audio_files && (
                <M.Stack spacing={2}>
                  <M.Typography variant="h6" gutterBottom>
                    Select Audio Files
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
                      rows={audioFiles?.data ?? []}
                      count={audioFiles?.count ?? 0}
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

                  <M.Typography variant="body2" color="text.secondary">
                    {formData.audio_file_ids.length > 0 ? (
                      `Selected: ${formData.audio_file_ids.length} audio file${formData.audio_file_ids.length > 1 ? 's' : ''}`
                    ) : (
                      "No audio files selected"
                    )}
                  </M.Typography>
                </M.Stack>
              )}

              {/* Annotation Configuration Tab */}
              {activeTab === Tab.annotation_config && (
                <M.Stack spacing={2}>
                  <M.Typography variant="h6" gutterBottom>
                    Annotation Configuration
                  </M.Typography>
                  


                  <M.Stack direction="row" spacing={2}>
                    <M.TextField
                      label="Path"
                      onChange={(e) => annotationFilter.set("path", e.currentTarget.value)}
                      placeholder="path/to/folder"
                      value={annotationFilter.get("path")}
                      size="small"
                    />
                    <M.TextField
                      label="Tag"
                      onChange={(e) => annotationFilter.set("tag", e.currentTarget.value)}
                      placeholder="my-tag"
                      value={annotationFilter.get("tag")}
                      size="small"
                    />
                  </M.Stack>

                  <M.Paper sx={{ height: "300px", overflow: "hidden" }}>
                    <MR.Files.Table
                      rows={annotationFiles?.data ?? []}
                      count={annotationFiles?.count ?? 0}
                      pagination={annotationPagination}
                      selection={annotationSelection}
                      setPagination={setAnnotationPagination}
                      setSelection={setAnnotationSelection}
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

                  <M.Typography variant="body2" color="text.secondary">
                    {annotationSelection.size > 0 ? (
                      `Selected: ${annotationSelection.size} annotation file${annotationSelection.size > 1 ? 's' : ''}`
                    ) : (
                      "No annotation files selected"
                    )}
                  </M.Typography>

                  {formData.annotations?.file_id && (
                    <M.Stack spacing={2}>
                      <M.TextField
                        label="Labels (comma-separated key=value pairs)"
                        placeholder="background=0,upcall=1,grunt=2"
                        fullWidth
                        helperText="Map annotation labels to numeric values for ML training. Format: label=number,label=number"
                        onChange={(e) => {
                          const labels: Record<string, number> = {}
                          e.target.value.split(',').forEach(pair => {
                            const [key, value] = pair.trim().split('=')
                            if (key && value) {
                              labels[key.trim()] = parseInt(value.trim())
                            }
                          })
                          setFormData(prev => ({
                            ...prev,
                            annotations: {
                              ...prev.annotations!,
                              labels
                            }
                          }))
                        }}
                      />
                      
                      <M.TextField
                        label="Annotation Step (seconds)"
                        type="number"
                        value={formData.annotations.annotation_step}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          annotations: {
                            ...prev.annotations!,
                            annotation_step: parseFloat(e.target.value) || 0.5
                          }
                        }))}
                        inputProps={{ min: 0.1, step: 0.1 }}
                        fullWidth
                        helperText="Time step between annotation windows (optional, default: 0.5s)"
                      />
                      
                      <M.TextField
                        label="Minimum Overlap Ratio"
                        type="number"
                        value={formData.annotations.step_min_overlap}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          annotations: {
                            ...prev.annotations!,
                            step_min_overlap: parseFloat(e.target.value) || 0.7
                          }
                        }))}
                        inputProps={{ min: 0.1, max: 0.9, step: 0.1 }}
                        fullWidth
                        helperText="Minimum overlap between consecutive windows (optional, default: 0.7)"
                      />
                      
                      <M.FormControlLabel
                        control={
                          <M.Checkbox
                            checked={formData.annotations.only_augmented}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              annotations: {
                                ...prev.annotations!,
                                only_augmented: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Only process augmented audio files (optional)"
                      />
                    </M.Stack>
                  )}
                </M.Stack>
              )}

              {/* Random Selection Tab */}
              {activeTab === Tab.random_selection && (
                <M.Stack spacing={2}>
                  <M.Typography variant="h6" gutterBottom>
                    Random Selection Configuration
                  </M.Typography>
                  


                  <M.TextField
                    label="Number of Samples"
                    type="number"
                    value={formData.random_selections?.num_samples || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      random_selections: {
                        ...prev.random_selections,
                        num_samples: parseInt(e.target.value) || 0
                      }
                    }))}
                    fullWidth
                    helperText="Number of random samples to generate from the selected audio files"
                  />
                  
                  <M.TextField
                    label="Label *"
                    type="number"
                    required
                    inputProps={{ min: 0 }}
                    value={formData.random_selections?.label !== undefined ? formData.random_selections.label : ""}
                    onChange={(e) => {
                      const value = e.target.value
                      let numValue: number
                      if (value === "") {
                        numValue = 0
                      } else {
                        const parsed = parseInt(value)
                        numValue = isNaN(parsed) ? 0 : parsed
                      }
                      console.log('Label field change:', { value, numValue, currentLabel: formData.random_selections?.label })
                      setFormData(prev => ({
                        ...prev,
                        random_selections: {
                          ...prev.random_selections!,
                          label: numValue
                        }
                      }))
                    }}
                    fullWidth
                    error={formData.random_selections?.label === undefined || formData.random_selections.label < 0}
                    helperText={
                      formData.random_selections?.label === undefined || formData.random_selections.label < 0
                        ? "Label must be 0 or a positive number"
                        : "Label to assign to all randomly selected samples (0 or positive number)"
                    }
                  />

                  <M.TextField
                    label="Random Seed (optional)"
                    type="number"
                    value={formData.random_selections?.seed || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      random_selections: {
                        ...prev.random_selections,
                        seed: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    }))}
                    fullWidth
                    helperText="Seed for random number generator to ensure reproducible sampling. Leave empty for random seed."
                  />
                </M.Stack>
              )}
            </M.Box>


          </M.Stack>
        </M.DialogContent>

        <M.DialogActions>
          <M.Button onClick={handleClose} disabled={addGroupMutation.isPending}>
            Cancel
          </M.Button>
          <M.Button
            type="submit"
            variant="contained"
            disabled={addGroupMutation.isPending || !isFormValid}
            startIcon={addGroupMutation.isPending ? <M.CircularProgress size={16} /> : undefined}
          >
            Add Group
          </M.Button>
        </M.DialogActions>
      </form>
    </M.Dialog>
  )
} 