import { File, TrainerTask } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import EditRecipe from "./EditRecipe"
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView"
import { TreeItem } from "@mui/x-tree-view/TreeItem"
import { useTreeViewApiRef } from "@mui/x-tree-view/hooks"

export default function EditTaskLoader() {
  const maipl = MR.useMaipl()
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params["taskId"], null)

  const onClose = () => {
    navigate(-1)
  }

  const { data: task } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["trainer-tasks", taskId],
    queryFn: () => {
      return TrainerTask.get(maipl.client, taskId!)
    },
  })

  return (
    <MR.Modal onClose={onClose}>
      <EditTask onClose={onClose} task={task} />
    </MR.Modal>
  )
}

enum Tab {
  dataset_files = "dataset_files",
  recipe_files = "recipe_files",
  model_files = "model_files",
  train_table = "train_table",
  val_table = "val_table",
  options = "options",
}

type TrainerOptions = {
  model_name?: string
  audio_representation_config_id?: number
  epochs?: number
  seed?: number
  start_from_existing_model?: boolean
  existing_model_file_id?: number
}

function EditTask(props: {
  task?: TrainerTask.t
  onClose: () => void
}) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const apiRef = useTreeViewApiRef()
  const toggledItemRef = R.useRef<{ [itemId: string]: boolean }>({})

  const [tab, setTab] = R.useState<Tab>(Tab.dataset_files)
  const [name, setName] = R.useState("")
  const [description, setDescription] = R.useState("")
  const [options, setOptions] = R.useState<TrainerOptions>({})
  const [groups, setGroups] = R.useState<Array<string>>([])
  const [isModalOpen, setIsModalOpen] = R.useState(false)
  const [error, setError] = R.useState<string | null>(null)
  const [selectedTrainDatasets, setSelectedTrainDatasets] = R.useState<
    string[]
  >([])
  const [selectedValDatasets, setSelectedValDatasets] = R.useState<string[]>([])
  const [trainDatasetOptions, setTrainDatasetOptions] = R.useState<
    Record<string, { annotation: string; batchSize: number }>
  >({})
  const [valDatasetOptions, setValDatasetOptions] = R.useState<
    Record<string, { annotation: string; batchSize: number }>
  >({})
  const [startFromExistingModel, setStartFromExistingModel] = R.useState(false)
  const [isModelNameAuto, setIsModelNameAuto] = R.useState(true)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  const {
    debouncedFilter,
    filter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = MR.Files.useTable()

  const selectedFiles = Array.from(selection.values())
  const selectedTrainDatasetFiles = selectedFiles.filter(
    (file) => file.maipl_folder === File.t_maipl_folder.h5_databases
  )
  const selectedRecipeFiles = selectedFiles.filter(
    (file) => file.maipl_folder === File.t_maipl_folder.model_recipes
  )
  const selectedModelFiles = selectedFiles.filter(
    (file) => file.maipl_folder === File.t_maipl_folder.models
  )

  const { data: datasetFiles } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.h5_databases,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  const { data: recipeFiles } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.model_recipes,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  const { data: modelFiles } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.models,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  // Fetch audio configuration files for dropdown in Options tab
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

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof TrainerTask.create>) => {
      return TrainerTask.create(...vars)
    },
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not create task
        </M.Alert>
      ))
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (import.meta && (import.meta as any).env && (import.meta as any).env["DEV"]) {
        console.error("EditTask createMutation error", err, vars)
      }
    },
    onSettled: () => {
      createMutation.reset()
    },
    onSuccess: (task) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="success">
          Success: Created task #{task.id}
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["trainer_tasks", "list"] })
      props.onClose()
    },
  })

  const onCreate = () => {
    const selectedFiles = Array.from(selection.values())
    const datasetFiles = selectedFiles.filter(
      (file) => file.maipl_folder === File.t_maipl_folder.h5_databases
    )
    const recipeFiles = selectedFiles.filter(
      (file) => file.maipl_folder === File.t_maipl_folder.model_recipes
    )
    const modelFiles = selectedFiles.filter(
      (file) => file.maipl_folder === File.t_maipl_folder.models
    )

    if (datasetFiles.length !== 1 || recipeFiles.length !== 1) {
      console.error("Invalid number of files selected")
      return
    }

    const selectedDataset = datasetFiles[0]
    const selectedRecipe = recipeFiles[0]
    if (startFromExistingModel && modelFiles.length !== 1) {
      console.error("Model file must be selected in existing model mode")
      return
    }
    const selectedModel = startFromExistingModel ? modelFiles[0] : undefined

    const optionsWithMode = {
      ...options,
      start_from_existing_model: startFromExistingModel,
      existing_model_file_id: startFromExistingModel ? selectedModel?.id : undefined,
    }

    const filteredTrainOptions = Object.fromEntries(
      Object.entries(trainDatasetOptions).filter(([, opt]) =>
        Boolean(opt && typeof opt.annotation === "string" && opt.annotation.trim() !== "")
      )
    )
    const filteredValOptions = Object.fromEntries(
      Object.entries(valDatasetOptions).filter(([, opt]) =>
        Boolean(opt && typeof opt.annotation === "string" && opt.annotation.trim() !== "")
      )
    )

    const task = {
      name,
      description,
      options: optionsWithMode,
      dataset_file: selectedDataset.id,
      recipe_file: selectedRecipe.id,
      dataset_config: {
        train: selectedTrainDatasets.filter((dataset) => isDatasetItemId(dataset)),
        val: selectedValDatasets.filter((dataset) => isDatasetItemId(dataset)),
        train_options: filteredTrainOptions,
        val_options: filteredValOptions,
      },
    }
    createMutation.mutateAsync([maipl.client, task])
  }

  R.useEffect(() => {
    if (selectedTrainDatasetFiles.length == 1) {
      const meta = selectedTrainDatasetFiles[0].meta
      const hdf5_groups =
        meta && (meta as any).hdf5_structure && typeof (meta as any).hdf5_structure === "object"
          ? (meta as any).hdf5_structure as Record<string, unknown>
          : {}
      const transformedGroups = transformHDF5Groups(hdf5_groups)
      setGroups(transformedGroups)
    } else if (selectedTrainDatasetFiles.length == 0) {
      setGroups([])
    } else {
      setError("Only one dataset file can be selected.")
    }

    if (selectedRecipeFiles.length > 1) {
      setError("Only one recipe file can be selected.")
    }

    if (
      selectedRecipeFiles.length > 1 &&
      selectedTrainDatasetFiles.length > 1
    ) {
      setError("Only one recipe and one dataset file can be selected.")
    }
  }, [selection])

  R.useEffect(() => {
    if (!startFromExistingModel && tab === Tab.model_files) {
      setTab(Tab.dataset_files)
    }
  }, [startFromExistingModel, tab])

  const computeDefaultModelName = (taskName: string) => {
    const trimmed = (taskName || "").trim()
    if (!trimmed) return ""
    const base = trimmed
      .replace(/[\s/\\]+/g, "_")
      .replace(/[^\w.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
    return base ? `${base}_model.kt` : ""
  }

  R.useEffect(() => {
    if (isModelNameAuto) {
      const next = computeDefaultModelName(name)
      if (options.model_name !== next) {
        setOptions({ ...options, model_name: next })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isModelNameAuto])

  const transformHDF5Groups = (
    hdf5_groups: Record<string, any>
  ): Array<any> => {
    const groupPaths = Object.keys(hdf5_groups || {})
    type Node = { 
      id: string; 
      name: string; 
      children: Node[]; 
      parentId: string;
      isDataset?: boolean;
      samples?: number;
    }
    const nodeMap: Record<string, Node> = {}
    const ensureNode = (path: string, parentId: string, isDataset = false) => {
      if (!nodeMap[path]) {
        const name = path.split("/").filter(Boolean).slice(-1)[0] || "/"
        nodeMap[path] = { id: path, name, children: [], parentId, isDataset }
      }
      return nodeMap[path]
    }
    const normalize = (path: string) =>
      path.startsWith("/") ? path : `/${path}`
    
    // First, create all group nodes
    for (const gp of groupPaths) {
      const normalized = normalize(gp)
      const segments = normalized.split("/").filter(Boolean)
      let parent = "/"
      let current = ""
      for (const seg of segments) {
        current = parent === "/" ? `/${seg}` : `${parent}/${seg}`
        const node = ensureNode(current, parent)
        if (parent !== "/") {
          const parentNode = nodeMap[parent]
          if (parentNode && !parentNode.children.find((c) => c.id === node.id)) {
            parentNode.children.push(node)
          }
        }
        parent = current
      }
    }
    
    // Then, add dataset nodes for groups that have datasets and include sample information
    for (const [groupPath, groupData] of Object.entries(hdf5_groups)) {
      if (groupData && typeof groupData === 'object') {
        // Add sample count to group nodes
        const groupNode = nodeMap[normalize(groupPath)]
        if (groupNode && 'samples' in groupData) {
          groupNode.samples = (groupData as any).samples
        }
        
        // Add dataset nodes as children
        if ('datasets' in groupData) {
          const datasets = (groupData as any).datasets
          if (datasets && typeof datasets === 'object' && groupNode) {
            for (const [datasetName, _datasetInfo] of Object.entries(datasets)) {
              const datasetPath = `${normalize(groupPath)}/${datasetName}`
              const datasetNode = ensureNode(datasetPath, groupNode.id, true)
              // For datasets, inherit the sample count from their parent group
              if (groupData && typeof groupData === 'object' && 'samples' in groupData) {
                datasetNode.samples = (groupData as any).samples
              }
              if (!groupNode.children.find((c) => c.id === datasetNode.id)) {
                groupNode.children.push(datasetNode)
              }
            }
          }
        }
      }
    }
    
    // Top-level nodes have parentId "/"
    return Object.values(nodeMap).filter((n) => n.parentId === "/")
  }

  const CustomTreeItem = ({ node }: { node: any }) => (
    <TreeItem 
      key={node.id} 
      itemId={node.id} 
      label={
        <M.Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
          <M.Typography 
            variant="body2" 
            sx={{ 
              flexGrow: 1,
              fontWeight: node.isDataset ? 'normal' : 'medium',
              color: node.isDataset ? 'text.secondary' : 'text.primary'
            }}
          >
            {node.name}
          </M.Typography>
          {node.isDataset && node.samples !== undefined && (
            <M.Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                minWidth: '60px',
                textAlign: 'right'
              }}
            >
              {node.samples.toLocaleString()} samples
            </M.Typography>
          )}
        </M.Box>
      }
    >
      {node.children && node.children.length > 0
        ? node.children.map((childNode: any) => (
            <CustomTreeItem key={childNode.id} node={childNode} />
          ))
        : null}
    </TreeItem>
  )

  const renderTree = (nodes: Array<any>): React.ReactNode =>
    nodes.map((node) => <CustomTreeItem key={node.id} node={node} />)

  const flattenGroups = (nodes: Array<any>): Array<{ id: string; name: string }> => {
    const result: Array<{ id: string; name: string }> = []
    const walk = (ns: Array<any>) => {
      ns.forEach((n) => {
        result.push({ id: n.id, name: n.name })
        if (n.children && n.children.length > 0) walk(n.children)
      })
    }
    walk(nodes)
    return result
  }

  const isDatasetItemId = (id: string) =>
    typeof id === "string" && id.startsWith("/") && id.length > 1 && id.includes("/data")

  const isGroupSelected = (groupId: string, selectedItems: string[]): boolean => {
    const childDatasets = getAllChildDatasets(groupId, groups)
    return childDatasets.length > 0 && childDatasets.every(datasetId => selectedItems.includes(datasetId))
  }

  const createItemSelectionToggleHandler = (
    selectedDatasets: string[],
    setSelectedDatasets: React.Dispatch<React.SetStateAction<string[]>>,
    datasetOptions: Record<string, { annotation: string; batchSize: number }>,
    setDatasetOptions: React.Dispatch<React.SetStateAction<Record<string, { annotation: string; batchSize: number }>>>
  ) => {
    return (event: React.SyntheticEvent, itemId: string, isSelected: boolean) => {
      // Only handle groups in toggle handler, let datasets use normal selection flow
      if (!isDatasetItemId(itemId)) {
        const currentSelected = isGroupSelected(itemId, selectedDatasets)
        const shouldSelect = !currentSelected // Toggle the group state
        
        // Get all child datasets for this group
        const childDatasets = getAllChildDatasets(itemId, groups)
        
        // Update the current selection directly
        let newSelection: string[]
        if (shouldSelect) {
          // Add all child datasets to selection
          newSelection = Array.from(new Set([...selectedDatasets, ...childDatasets]))
        } else {
          // Remove all child datasets from selection
          newSelection = selectedDatasets.filter(id => !childDatasets.includes(id))
        }
        
        // Update the state directly
        setSelectedDatasets(newSelection)
        
        // Update options for new datasets
        const newOptions: Record<string, { annotation: string; batchSize: number }> = {}
        newSelection.forEach((datasetId) => {
          newOptions[datasetId] = datasetOptions[datasetId] || {
            annotation: "",
            batchSize: 32,
          }
        })
        setDatasetOptions(newOptions)
        
        // Update toggled ref for UI feedback (only for groups)
        toggledItemRef.current[itemId] = shouldSelect
        childDatasets.forEach(childId => {
          toggledItemRef.current[childId] = shouldSelect
        })
      }
      // For datasets, do nothing - let the normal selection change handler handle it
    }
  }

  const handleTrainItemSelectionToggle = createItemSelectionToggleHandler(
    selectedTrainDatasets,
    setSelectedTrainDatasets,
    trainDatasetOptions,
    setTrainDatasetOptions
  )

  const handleValItemSelectionToggle = createItemSelectionToggleHandler(
    selectedValDatasets,
    setSelectedValDatasets,
    valDatasetOptions,
    setValDatasetOptions
  )

  const getAllChildDatasets = (nodeId: string, nodes: Array<any>): string[] => {
    const findNode = (id: string, nodeList: Array<any>): any => {
      for (const node of nodeList) {
        if (node.id === id) return node
        const found = findNode(id, node.children || [])
        if (found) return found
      }
      return null
    }

    const node = findNode(nodeId, nodes)
    if (!node) return []

    const childDatasets: string[] = []
    const collectDatasets = (n: any) => {
      if (n.isDataset) {
        childDatasets.push(n.id)
      }
      if (n.children) {
        n.children.forEach(collectDatasets)
      }
    }

    collectDatasets(node)
    return childDatasets
  }

  const createSelectionChangeHandler = (
    setSelectedDatasets: React.Dispatch<React.SetStateAction<string[]>>,
    setDatasetOptions: React.Dispatch<
      React.SetStateAction<
        Record<string, { annotation: string; batchSize: number }>
      >
    >,
    currentOptions: Record<string, { annotation: string; batchSize: number }>
  ) => {
    return (_event: React.SyntheticEvent, newSelectedItems: string[]) => {
      // Check if this change was triggered by our toggle handler
      const hasToggledItems = Object.keys(toggledItemRef.current).length > 0
      
      if (hasToggledItems) {
        // If toggle handler was involved, don't override the selection
        // Just clear the toggle ref and return
        toggledItemRef.current = {}
        return
      }
      
      // Otherwise, handle normal selection changes (filter to only include dataset selections)
      const datasetSelections = newSelectedItems.filter((itemId) => isDatasetItemId(itemId))
      const finalSelectedItems = Array.from(new Set(datasetSelections))
      
      setSelectedDatasets(finalSelectedItems)

      const newOptions: Record<
        string,
        { annotation: string; batchSize: number }
      > = {}

      finalSelectedItems.forEach((itemId) => {
        newOptions[itemId] = currentOptions[itemId] || {
          annotation: "",
          batchSize: 32,
        }
      })
      setDatasetOptions(newOptions)

      toggledItemRef.current = {}
    }
  }

  const handleTrainSelectionChange = createSelectionChangeHandler(
    setSelectedTrainDatasets,
    setTrainDatasetOptions,
    trainDatasetOptions
  )

  const handleValSelectionChange = createSelectionChangeHandler(
    setSelectedValDatasets,
    setValDatasetOptions,
    valDatasetOptions
  )

  // Compute which items should appear selected in the tree (datasets + groups with all children selected)
  const getVisibleSelectedItems = (selectedDatasets: string[]) => {
    const visibleItems = [...selectedDatasets]
    
    // Add groups that have all their children selected
    const addSelectedGroups = (nodes: Array<any>) => {
      nodes.forEach(node => {
        if (!node.isDataset && node.children) {
          const childDatasets = getAllChildDatasets(node.id, groups)
          if (childDatasets.length > 0 && childDatasets.every(datasetId => selectedDatasets.includes(datasetId))) {
            visibleItems.push(node.id)
          }
          addSelectedGroups(node.children)
        }
      })
    }
    
    addSelectedGroups(groups)
    return Array.from(new Set(visibleItems))
  }
  return (
    <MR.Modal onClose={props.onClose} sx={{ minWidth: 800 }}>
      <M.Stack sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Stack direction="row" alignItems="center">
          <M.Typography variant="h6">Create new training task ...</M.Typography>
          <M.Stack sx={{ flexGrow: 1 }} />
          <M.FormControlLabel
            control={
              <M.Switch
                checked={startFromExistingModel}
                onChange={(e) => {
                  const checked = e.target.checked
                  setStartFromExistingModel(checked)
                  if (checked) setTab(Tab.model_files)
                }}
              />
            }
            label={startFromExistingModel ? "With existing model" : "New model"}
          />
        </M.Stack>
        <M.Stack component={M.Paper} padding={2}>
          <M.TextField
            label="Task Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <M.TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </M.Stack>
        <M.Stack direction="row" flexGrow={1} justifyContent="center">
          <M.Tabs
            indicatorColor="primary"
            onChange={(_e, value) => setTab(value as Tab)}
            value={tab}
          >
            <M.Tab label="Dataset Files" value={Tab.dataset_files} />
            <M.Tab label="Recipe Files" value={Tab.recipe_files} />
            {startFromExistingModel && (
              <M.Tab label="Model Files" value={Tab.model_files} />
            )}
            <M.Tab label="Train Table" value={Tab.train_table} />
            <M.Tab label="Validation Table" value={Tab.val_table} />
            <M.Tab label="Options" value={Tab.options} />
          </M.Tabs>
        </M.Stack>
        {tab == Tab.dataset_files && (
          <M.Stack sx={{ height: 400 }}>
            <M.Stack direction="row" alignItems="center">
              <M.TextField
                label="Path"
                onChange={(e) => filter.set("path", e.target.value)}
                placeholder="path/to/folder"
                value={filter.get("path")}
              />
              <M.TextField
                label="Tag"
                onChange={(e) => filter.set("tag", e.target.value)}
                placeholder="my-tag"
                value={filter.get("tag")}
              />
            </M.Stack>
            <MR.Files.Table
              rows={datasetFiles.data}
              count={datasetFiles.count}
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
          </M.Stack>
        )}
        {tab == Tab.recipe_files && (
          <M.Stack sx={{ height: 400 }}>
            <M.Stack direction="row" alignItems="center">
              <M.TextField
                label="Path"
                onChange={(e) => filter.set("path", e.target.value)}
                placeholder="path/to/folder"
                value={filter.get("path")}
              />
              <M.TextField
                label="Tag"
                onChange={(e) => filter.set("tag", e.target.value)}
                placeholder="my-tag"
                value={filter.get("tag")}
              />
              <M.Stack flexGrow={1} />
              <M.Button
                size="medium"
                children="Add Recipe"
                onClick={openModal}
              />
              <M.Modal
                open={isModalOpen}
                onClose={closeModal}
                aria-labelledby="edit-recipe-modal"
              >
                <M.Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "60%",
                    maxWidth: "40%",
                    maxHeight: "80vh",
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    overflow: "auto",
                  }}
                >
                  <EditRecipe onClose={closeModal} />
                </M.Box>
              </M.Modal>
            </M.Stack>
            <MR.Files.Table
              rows={recipeFiles.data}
              count={recipeFiles.count}
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
          </M.Stack>
        )}
        {tab == Tab.model_files && (
          <M.Stack sx={{ height: 400 }}>
            <M.Stack direction="row" alignItems="center">
              <M.TextField
                label="Path"
                onChange={(e) => filter.set("path", e.target.value)}
                placeholder="path/to/folder"
                value={filter.get("path")}
              />
              <M.TextField
                label="Tag"
                onChange={(e) => filter.set("tag", e.target.value)}
                placeholder="my-tag"
                value={filter.get("tag")}
              />
            </M.Stack>
            <MR.Files.Table
              rows={modelFiles.data}
              count={modelFiles.count}
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
          </M.Stack>
        )}
        {tab == Tab.train_table && (
          <M.Stack sx={{ height: 400, overflow: "auto" }}>
            {/* Header row */}
            <M.Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              px: 2, 
              py: 1, 
              borderBottom: 1, 
              borderColor: 'divider',
              backgroundColor: 'grey.50',
              fontWeight: 'medium'
            }}>
              <M.Typography variant="caption" sx={{ flexGrow: 1, fontWeight: 'medium' }}>
                Dataset
              </M.Typography>
              <M.Typography variant="caption" sx={{ minWidth: '60px', textAlign: 'right', fontWeight: 'medium' }}>
                Samples
              </M.Typography>
            </M.Box>
            <SimpleTreeView
              multiSelect
              checkboxSelection
              apiRef={apiRef}
              selectedItems={getVisibleSelectedItems(selectedTrainDatasets)}
              onSelectedItemsChange={handleTrainSelectionChange}
              onItemSelectionToggle={handleTrainItemSelectionToggle}
            >
              {renderTree(groups)}
            </SimpleTreeView>
            {selectedTrainDatasets
              .filter((dataset) => isDatasetItemId(dataset))
              .map((dataset) => (
                <M.Box key={dataset} sx={{ mt: 2 }}>
                  <M.Stack direction="row" spacing={2} alignItems="center">
                    <M.Typography variant="subtitle1">{dataset}</M.Typography>
                    <M.FormControl sx={{ flexGrow: 1 }}>
                      <M.InputLabel>Annotation Dataset</M.InputLabel>
                      <M.Select
                        label="Annotation Dataset"
                        value={trainDatasetOptions[dataset]?.annotation || ""}
                        onChange={(e) =>
                          setTrainDatasetOptions((prev) => ({
                            ...prev,
                            [dataset]: {
                              ...prev[dataset],
                              annotation: e.target.value as string,
                            },
                          }))
                        }
                      >
                        {flattenGroups(groups).map((node) => (
                          <M.MenuItem key={node.id} value={node.id}>
                            {node.id}
                          </M.MenuItem>
                        ))}
                      </M.Select>
                    </M.FormControl>
                    <M.TextField
                      type="number"
                      label="Batch Size"
                      value={trainDatasetOptions[dataset]?.batchSize || ""}
                      onChange={(e) =>
                        setTrainDatasetOptions((prev) => ({
                          ...prev,
                          [dataset]: {
                            ...prev[dataset],
                            batchSize: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      sx={{ width: "150px" }}
                    />
                  </M.Stack>
                </M.Box>
              ))}
          </M.Stack>
        )}
        {tab == Tab.val_table && (
          <M.Stack sx={{ height: 400, overflow: "auto" }}>
            {/* Header row */}
            <M.Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              px: 2, 
              py: 1, 
              borderBottom: 1, 
              borderColor: 'divider',
              backgroundColor: 'grey.50',
              fontWeight: 'medium'
            }}>
              <M.Typography variant="caption" sx={{ flexGrow: 1, fontWeight: 'medium' }}>
                Dataset
              </M.Typography>
              <M.Typography variant="caption" sx={{ minWidth: '60px', textAlign: 'right', fontWeight: 'medium' }}>
                Samples
              </M.Typography>
            </M.Box>
            <SimpleTreeView
              multiSelect
              checkboxSelection
              apiRef={apiRef}
              selectedItems={getVisibleSelectedItems(selectedValDatasets)}
              onSelectedItemsChange={handleValSelectionChange}
              onItemSelectionToggle={handleValItemSelectionToggle}
            >
              {renderTree(groups)}
            </SimpleTreeView>
            {selectedValDatasets
              .filter((dataset) => isDatasetItemId(dataset))
              .map((dataset) => (
                <M.Box key={dataset} sx={{ mt: 2 }}>
                  <M.Stack direction="row" spacing={2} alignItems="center">
                    <M.Typography variant="subtitle1">{dataset}</M.Typography>
                    <M.FormControl sx={{ flexGrow: 1 }}>
                      <M.InputLabel>Annotation Dataset</M.InputLabel>
                      <M.Select
                        label="Annotation Dataset"
                        value={valDatasetOptions[dataset]?.annotation || ""}
                        onChange={(e) =>
                          setValDatasetOptions((prev) => ({
                            ...prev,
                            [dataset]: {
                              ...prev[dataset],
                              annotation: e.target.value as string,
                            },
                          }))
                        }
                      >
                        {flattenGroups(groups).map((node) => (
                          <M.MenuItem key={node.id} value={node.id}>
                            {node.id}
                          </M.MenuItem>
                        ))}
                      </M.Select>
                    </M.FormControl>
                    <M.TextField
                      type="number"
                      label="Batch Size"
                      value={valDatasetOptions[dataset]?.batchSize || ""}
                      onChange={(e) =>
                        setValDatasetOptions((prev) => ({
                          ...prev,
                          [dataset]: {
                            ...prev[dataset],
                            batchSize: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      sx={{ width: "150px" }}
                    />
                  </M.Stack>
                </M.Box>
              ))}
          </M.Stack>
        )}
        {tab == Tab.options && (
          <M.Stack
            sx={{ flexGrow: 1, overflow: "auto", height: 400, padding: 2 }}
          >
            {/* Model Name Field */}
            <M.FormControl fullWidth>
              <M.Stack direction="row" alignItems="center" spacing={1}>
                <M.TextField
                  label="Model Name"
                  value={options.model_name || ""}
                  onChange={(e) => {
                    setOptions({ ...options, model_name: e.target.value })
                    setIsModelNameAuto(false)
                  }}
                  sx={{ flexGrow: 1 }}
                  required
                />
                <M.Tooltip title="Filename to save the trained model.">
                  <HelpOutlineIcon fontSize="small" />
                </M.Tooltip>
              </M.Stack>
            </M.FormControl>

            {/* Audio Representation Configuration (optional) */}
            <M.FormControl fullWidth>
              <M.Stack direction="row" alignItems="center" spacing={1}>
                <M.TextField
                  label="Audio Representation Configuration"
                  value={
                    options.audio_representation_config_id
                      ? String(options.audio_representation_config_id)
                      : ""
                  }
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      audio_representation_config_id: Number(e.target.value),
                    })
                  }
                  select
                  fullWidth
                  helperText="Select the audio configuration (optional)"
                >
                  <M.MenuItem value="">
                    <M.Typography color="text.secondary">
                      Select audio configuration...
                    </M.Typography>
                  </M.MenuItem>
                  {Array.from(audioConfigFiles?.values() || []).map((file) => (
                    <M.MenuItem key={file.id} value={file.id}>
                      {`${file.maipl_folder}/${file.path}`}
                    </M.MenuItem>
                  ))}
                </M.TextField>
                <M.Tooltip title="Audio preprocessing config to apply during training.">
                  <HelpOutlineIcon fontSize="small" />
                </M.Tooltip>
              </M.Stack>
            </M.FormControl>
            {/* Epochs Field */}
            <M.FormControl fullWidth>
              <M.Stack direction="row" alignItems="center" spacing={1}>
                <M.TextField
                  type="number"
                  label="Epochs"
                  value={options.epochs || ""}
                  onChange={(e) =>
                    setOptions({ ...options, epochs: parseInt(e.target.value) })
                  }
                  sx={{ flexGrow: 1 }}
                />
                <M.Tooltip title="Number of epochs to train the model.">
                  <HelpOutlineIcon fontSize="small" />
                </M.Tooltip>
              </M.Stack>
            </M.FormControl>

            {/* Seed Field */}
            <M.FormControl fullWidth>
              <M.Stack direction="row" alignItems="center" spacing={1}>
                <M.TextField
                  type="number"
                  label="Seed"
                  value={options.seed || ""}
                  onChange={(e) =>
                    setOptions({ ...options, seed: parseInt(e.target.value) })
                  }
                  sx={{ flexGrow: 1 }}
                />
                <M.Tooltip title="Seed for random number generator for reproducibility.">
                  <HelpOutlineIcon fontSize="small" />
                </M.Tooltip>
              </M.Stack>
            </M.FormControl>
          </M.Stack>
        )}
      </M.Stack>
      <M.Stack direction="row" alignItems="center" sx={{ pt: 2 }}>
        {selectedTrainDatasetFiles.length > 1 ? (
          <M.Typography color="error" sx={{ flexGrow: 1 }}>
            {error}
          </M.Typography>
        ) : (
          <M.Stack sx={{ flexGrow: 1 }} />
        )}
        <M.Stack direction="row" spacing={2}>
          <M.Button children="Cancel" onClick={props.onClose} />
          <M.Button
            children="Create"
            disabled={
              selectedTrainDatasetFiles.length !== 1 ||
              selectedRecipeFiles.length !== 1 ||
              (startFromExistingModel && selectedModelFiles.length !== 1)
            }
            onClick={onCreate}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
