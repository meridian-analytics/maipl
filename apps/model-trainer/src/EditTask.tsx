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

export default function EditTaskLoader() {
  const maipl = MR.useMaipl()
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params["taskId"], null)

  const onClose = () => {
    navigate(-1)
  }

  const { data: task, error } = RQ.useQuery({
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

function EditTask(props: {
  task?: TrainerTask.t
  onClose: () => void
  addTask: (task: TrainerTask.t) => void
}) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const [tab, setTab] = R.useState<Tab>(Tab.dataset_files)
  const [name, setName] = R.useState("")
  const [description, setDescription] = R.useState("")
  const [datasetFile, setDatasetFile] = R.useState<File.t>()
  const [recipeFile, setRecipeFile] = R.useState<File.t>()
  const [modelFile, setModelFile] = R.useState<File.t>()
  const [options, setOptions] = R.useState<TrainerTask.t_options>({})
  const [groups, setGroups] = R.useState<Array<string>>({})
  const [isModalOpen, setIsModalOpen] = R.useState(false)
  const [error, setError] = R.useState<string | null>(null)
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

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

  const {
    debouncedFilter,
    filter,
    folder,
    pagination,
    selection,
    setFolder,
    setPagination,
    setSelection,
  } = MR.Files.useTable()

  const { data: datasetFiles } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.dataset,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  const { data: recipeFiles } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.recipe,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  const { data: modelFiles } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.model,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
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
      if (import.meta.env["DEV"]) {
        console.error("EditTask createMutation error", err, vars)
      }
    },
    onSettled: () => {
      createMutation.reset()
    },
    onSuccess: (task) => {
      console.log("task is created", task)
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
      (file) => file.maipl_folder === File.t_maipl_folder.dataset
    )
    const recipeFiles = selectedFiles.filter(
      (file) => file.maipl_folder === File.t_maipl_folder.recipe
    )
    const modelFiles = selectedFiles.filter(
      (file) => file.maipl_folder === File.t_maipl_folder.model
    )

    if (datasetFiles.length !== 1 || recipeFiles.length !== 1) {
      console.error("Invalid number of files selected")
      return
    }

    const selectedDataset = datasetFiles[0]
    const selectedRecipe = recipeFiles[0]
    const selectedModel = modelFiles.length > 0 ? modelFiles[0] : undefined

    const task = {
      name,
      description,
      celery_task_id: "",
      dataset_file: selectedDataset.id,
      recipe_file: selectedRecipe.id,
      model_file: selectedModel?.id,
      options,
      status: "CREATED",
    }

    console.log(task)
    createMutation.mutateAsync([maipl.client, task])
  }

  const selectedFiles = Array.from(selection.values())
  const selectedTrainDatasetFiles = selectedFiles.filter(
    (file) => file.maipl_folder === File.t_maipl_folder.dataset
  )
  const selectedRecipeFiles = selectedFiles.filter(
    (file) => file.maipl_folder === File.t_maipl_folder.recipe
  )

  R.useEffect(() => {
    if (selectedTrainDatasetFiles.length == 1) {
      const hdf5_groups = selectedTrainDatasetFiles[0].meta["hdf5_structure"]
      setGroups(hdf5_groups)
    } else if (selectedTrainDatasetFiles.length == 0) {
      setGroups({})
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

  const renderTree = (nodes: Record<string, any>, path: string[] = []) =>
    Object.entries(nodes).map(([key, value]) => (
      <TreeItem
        key={key}
        itemId={[...path, key].join("/")}
        label={key}
        children={
          value && typeof value === "object" && Object.keys(value).length > 0
            ? renderTree(value, [...path, key])
            : null
        }
      />
    ))

  const handleSelectionChange = (
    event: React.SyntheticEvent,
    itemIds: string[]
  ) => {
    setSelectedTrainDatasets(itemIds)

    const newOptions: Record<
      string,
      { annotation: string; batchSize: number }
    > = {}
    itemIds.forEach((itemId) => {
      newOptions[itemId] = trainDatasetOptions[itemId] || {
        annotation: "",
        batchSize: 32,
      }
    })
    setTrainDatasetOptions(newOptions)
  }

  const handleValSelectionChange = (
    event: React.SyntheticEvent,
    itemIds: string[]
  ) => {
    setSelectedValDatasets(itemIds)

    const newOptions: Record<
      string,
      { annotation: string; batchSize: number }
    > = {}
    itemIds.forEach((itemId) => {
      newOptions[itemId] = valDatasetOptions[itemId] || {
        annotation: "",
        batchSize: 32,
      }
    })
    setValDatasetOptions(newOptions)
  }

  return (
    <MR.Modal onClose={props.onClose} sx={{ minWidth: 800 }}>
      <M.Stack sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography variant="h6">Create new training task ...</M.Typography>
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
            <M.Tab label="Model Files" value={Tab.model_files} />
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
                  <EditRecipe />
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
            <SimpleTreeView
              multiSelect
              checkboxSelection
              selectedItems={selectedTrainDatasets}
              onSelectedItemsChange={handleSelectionChange}
            >
              {renderTree(groups)}
            </SimpleTreeView>
            {selectedTrainDatasets.map((dataset) => (
              <M.Box key={dataset} sx={{ mt: 2 }}>
                <M.Stack direction="row" spacing={2} alignItems="center">
                  <M.Typography variant="subtitle1">{dataset}</M.Typography>
                  <M.FormControl sx={{ flexGrow: 1 }}>
                    <M.InputLabel>Annotation Dataset</M.InputLabel>
                    <M.Select
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
                      {Object.entries(groups).flatMap(([group, datasets]) =>
                        Object.keys(datasets).map((ds) => (
                          <M.MenuItem
                            key={`${group}.${ds}`}
                            value={`${group}.${ds}`}
                          >
                            {`${group}.${ds}`}
                          </M.MenuItem>
                        ))
                      )}
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
            <SimpleTreeView
              multiSelect
              checkboxSelection
              selectedItems={selectedValDatasets}
              onSelectedItemsChange={handleValSelectionChange}
            >
              {renderTree(groups)}
            </SimpleTreeView>
            {selectedValDatasets.map((dataset) => (
              <M.Box key={dataset} sx={{ mt: 2 }}>
                <M.Stack direction="row" spacing={2} alignItems="center">
                  <M.Typography variant="subtitle1">{dataset}</M.Typography>
                  <M.FormControl sx={{ flexGrow: 1 }}>
                    <M.InputLabel>Annotation Dataset</M.InputLabel>
                    <M.Select
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
                      {Object.entries(groups).flatMap(([group, datasets]) =>
                        Object.keys(datasets).map((ds) => (
                          <M.MenuItem
                            key={`${group}.${ds}`}
                            value={`${group}.${ds}`}
                          >
                            {`${group}.${ds}`}
                          </M.MenuItem>
                        ))
                      )}
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
                  onChange={(e) =>
                    setOptions({ ...options, model_name: e.target.value })
                  }
                  sx={{ flexGrow: 1 }}
                  required
                />
                <M.Tooltip title="Filename to save the trained model.">
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

            {/* Checkpoints Field */}
            <M.FormControl fullWidth>
              <M.Stack direction="row" alignItems="center" spacing={1}>
                <M.TextField
                  type="number"
                  label="Checkpoints"
                  value={options.checkpoints || ""}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      checkpoints: parseInt(e.target.value),
                    })
                  }
                  sx={{ flexGrow: 1 }}
                />
                <M.Tooltip title="Frequency (in epochs) to save checkpoints during training.">
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
              selection.size < 2 || selectedTrainDatasetFiles.length !== 1
            }
            onClick={onCreate}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
