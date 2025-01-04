import { File } from "@maipl/api"
import * as F from "@maipl/format"
import * as JS from "@maipl/js"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import * as R from "react"
import * as DZ from "react-dropzone"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"

// Styles for the dropzone area
const style = {
  base: {
    borderColor: M.colors.grey[500],
    borderStyle: "dashed",
    borderWidth: 2,
    backgroundColor: M.colors.grey[100],
    padding: 6,
  },
  focused: {
    borderColor: M.colors.blue[500],
  },
  accept: {
    borderColor: M.colors.green[500],
  },
  reject: {
    borderColor: M.colors.red[500],
  },
}

// Type definitions for tracking upload progress and status
type UploadProgress = {
  loaded: number        // Number of bytes uploaded
  total: number         // Total file size in bytes
  startTime: number     // Upload start timestamp
  lastLoaded: number    // Previously loaded bytes (for speed calculation)
  lastTime: number      // Previous timestamp (for speed calculation)
  speedSamples: number[] // Array of recent upload speeds for averaging
}

// Maps file paths to their current status and progress
type UploadStatus = Map<
  string,
  {
    status: string
    progress?: UploadProgress
  }
>

// Represents a file in the upload table
type FileState = {
  id: string
  name: string
  path: string
  size: number
  status: string
  progress?: UploadProgress
}

// Possible states for the action buttons
type ActionState =
  | "none"      // Initial state
  | "pending"   // Selected but not started
  | "uploading" // Currently uploading
  | "cancelling"// Cancel in progress
  | "cancelled" // Upload cancelled
  | "error"     // Upload failed
  | "duplicate" // File already exists
  | "ok"        // Upload completed

const column = RT.createColumnHelper<FileState>()

const AcceptedFiles = MR.Table<FileState, string>()

export const element = <Element />

export const loader = (_maipl: MR.t_context) =>
  (async ({ request }) => {
    // folder query param
    const url = new URL(request.url)
    const search = url.searchParams
    const folder = search.get("folder") ?? "raw"
    JS.invariantEnum(folder, File.t_maipl_folder, "File.t_maipl_folder")
    // payload
    return { folder }
  }) satisfies RR.LoaderFunction

function Element() {
  const navigate = RR.useNavigate()
  const { folder } = RRT.useLoaderData<ReturnType<typeof loader>>()
  const onClose = () => {
    navigate(-1)
  }
  switch (folder) {
    case File.t_maipl_folder.annotation:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "text/csv": [".csv"],
          }}
        />
      )
    case File.t_maipl_folder.config:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "application/json": [".json"],
          }}
        />
      )
    case File.t_maipl_folder.dataset:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "application/hdf5": [".h5"],
          }}
        />
      )
    case File.t_maipl_folder.model:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "application/zip": [".kt"],
          }}
        />
      )
    case File.t_maipl_folder.raw:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "audio/flac": [".flac"],
            "audio/x-wav": [".wav"],
          }}
        />
      )
    case File.t_maipl_folder.metrics:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "text/csv": [".csv"],
          }}
        />
      )
    case File.t_maipl_folder.recipe:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "application/json": [".json"],
          }}
        />
      )
  }
}

// Memoized action button component to prevent unnecessary re-renders
const ActionButton = R.memo(
  ({
    state,
    onCancel,
    onRetry,
  }: {
    state: ActionState
    onCancel: () => void
    onRetry: () => void
  }) => {
    if (state === "uploading") {
      return (
        <M.Button
          size="small"
          color="error"
          onClick={onCancel}
          startIcon={<I.Cancel />}
        >
          Cancel
        </M.Button>
      )
    }

    if (state === "cancelling") {
      return (
        <M.Button
          size="small"
          disabled
          startIcon={<M.CircularProgress size={16} />}
        >
          Cancelling
        </M.Button>
      )
    }

    if (state === "error" || state === "cancelled") {
      return (
        <M.Button size="small" onClick={onRetry} startIcon={<I.Refresh />}>
          Retry
        </M.Button>
      )
    }

    return null
  },
  // Only re-render if the state changes
  (prev, next) => prev.state === next.state
)

// Main file upload component with two steps:
// 1. File selection via dropzone
// 2. Upload management with progress tracking
export default function FileUpload(props: {
  accept?: DZ.Accept           // Allowed file types
  disabled?: boolean          // Whether uploads are allowed
  folder: File.t_maipl_folder // Target folder for uploads
  onClose: () => void        // Called when modal is closed
  text?: string              // Custom dropzone text
  validator?: DZ.DropzoneOptions["validator"] // Custom file validation
}) {
  const dz = DZ.useDropzone({
    accept: props.accept,
    disabled: props.disabled,
    validator: props.validator,
  })
  const dzStyle = R.useMemo(
    () => ({
      ...style.base,
      ...(dz.isFocused ? style.focused : {}),
      ...(dz.isDragAccept ? style.accept : {}),
      ...(dz.isDragReject ? style.reject : {}),
    }),
    [dz.isFocused, dz.isDragAccept, dz.isDragReject]
  )
  if (dz.acceptedFiles.length > 0) {
    return (
      <FileUploadStep2
        files={dz.acceptedFiles}
        folder={props.folder}
        onClose={props.onClose}
      />
    )
  }
  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack>
        <M.Typography
          variant="h5"
          children={`Upload files to: /${props.folder}`}
        />
        <M.Box {...dz.getRootProps({ sx: dzStyle })}>
          <input {...dz.getInputProps()} />
          {props.disabled ? (
            <M.Stack alignItems="center" spacing={6}>
              <UploadIcon icon={I.Cancel} label="Not Allowed" />
              <M.Typography>
                {props.text ?? "This folder does not allow uploads"}
              </M.Typography>
            </M.Stack>
          ) : (
            <M.Stack alignItems="center" spacing={6}>
              <M.Stack direction="row">
                <UploadIcon icon={I.FolderOutlined} label="Folder" />
                {Object.entries(props.accept ?? {}).flatMap(([_mime, exts]) =>
                  exts.map((e) => (
                    <UploadIcon
                      icon={I.InsertDriveFileOutlined}
                      key={e}
                      label={e}
                    />
                  ))
                )}
              </M.Stack>
              <M.Typography>
                {props.text ?? "Drag and drop or click to select files here"}
              </M.Typography>
            </M.Stack>
          )}
        </M.Box>
        <M.Stack direction="row-reverse">
          <M.Button children="Cancel" onClick={props.onClose} />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}

// Second step of file upload process - handles actual file uploads
function FileUploadStep2(props: {
  files: Array<DZ.FileWithPath>  // Files selected for upload
  folder: File.t_maipl_folder   // Target folder
  onClose: () => void          // Called when modal is closed
}) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  // state
  const [tag, setTag] = R.useState("")
  const [status, setStatus] = R.useState<UploadStatus>(() => new Map())
  // table
  const table = MR.useTable<FileState, string>()
  const [actionStates, setActionStates] = R.useState<Map<string, ActionState>>(
    () => new Map()
  )
  const [abortControllers] = R.useState<Map<string, AbortController>>(
    () => new Map()
  )

  // sorted files
  const sortedFiles = R.useMemo(
    () =>
      [...props.files].sort((a, b) =>
        (a.path ?? a.name).localeCompare(b.path ?? b.name)
      ),
    [props.files]
  )

  // event handlers
  const onUpload = () => {
    if (uploadMutation.isIdle) {
      return uploadMutation.mutateAsync()
    }
  }

  // Update the uploadMutation
  const uploadMutation = RQ.useMutation({
    mutationFn: async () => {
      const filesToUpload = sortedFiles.filter((file) =>
        table.selection.has(file.path ?? file.name)
      )

      return Promise.allSettled(
        filesToUpload.map((file) => {
          const path = file.path ?? file.name
          setActionStates((states) => {
            const newStates = new Map(states)
            newStates.set(path, "uploading")
            return newStates
          })
          setStatus((status) => {
            const newStatus = new Map(status)
            newStatus.set(path, {
              status: "0.00%",
              progress: {
                loaded: 0,
                total: file.size,
                startTime: Date.now(),
                lastLoaded: 0,
                lastTime: Date.now(),
                speedSamples: [],
              },
            })
            return newStatus
          })
          return uploadSingleFile(file)
        })
      )
    },
    onError: (error, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="error">
          Error: There was an error uploading files
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("FileUpload uploadMutation error", error, vars)
      }
    },
    onSettled: () => {
      uploadMutation.reset()
    },
    onSuccess: (data) => {
      notify((onClose) => {
        const count = data.filter((f) => f.status == "fulfilled").length
        return count == data.length ? (
          <M.Alert onClose={onClose} severity="success">
            Success: Uploaded {count} files
          </M.Alert>
        ) : (
          <M.Alert onClose={onClose} severity="warning">
            Warning: Uploaded {count} of {data.length} files
          </M.Alert>
        )
      })
      queryClient.refetchQueries({ queryKey: ["files"] })
    },
  })

  const uploadFile = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onError: (err: any, vars) => {
      if (err.name === "CanceledError") {
        setActionStates((states) => {
          const newStates = new Map(states)
          newStates.set(vars[1].path, "cancelled")
          return newStates
        })
        setStatus((status) => {
          const newStatus = new Map(status)
          newStatus.set(vars[1].path, { status: "cancelled" })
          return newStatus
        })
        return
      }

      if (import.meta.env["DEV"]) {
        console.error("FileUpload uploadFile error", err, vars)
      }

      // Handle 409 Conflict (Duplicate file)
      if (err.response?.status === 409) {
        const errorData = err.response.data as FileErrorResponse
        setActionStates((states) => {
          const newStates = new Map(states)
          newStates.set(vars[1].path, "duplicate")
          return newStates
        })
        setStatus((status) => {
          const newStatus = new Map(status)
          newStatus.set(vars[1].path, { status: "duplicate" })
          return newStatus
        })

        // Show a more informative notification
        notify((onClose) => (
          <M.Alert
            onClose={onClose}
            severity="warning"
          >
            File already exists: {errorData.path}
          </M.Alert>
        ))
        return
      }

      // Handle other errors
      setActionStates((states) => {
        const newStates = new Map(states)
        newStates.set(vars[1].path, "error")
        return newStates
      })
      setStatus((status) => {
        const newStatus = new Map(status)
        newStatus.set(vars[1].path, { status: "error" })
        return newStatus
      })

      // Show generic error notification
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="error">
          Error uploading file: {err.message}
        </M.Alert>
      ))
    },
    onSuccess: (file) => {
      setActionStates((states) => {
        const newStates = new Map(states)
        newStates.set(file.path, "ok")
        return newStates
      })
      setStatus((status) => {
        const newStatus = new Map(status)
        newStatus.set(file.path, { status: "ok" })
        return newStatus
      })
    },
  })

  // Mutation for handling single file upload with progress tracking
  const uploadSingleFile = R.useCallback(
    async (file: DZ.FileWithPath) => {
      const controller = new AbortController()
      const path = file.path ?? file.name

      // Initialize upload status
      setStatus((status) => {
        const newStatus = new Map(status)
        newStatus.set(path, {
          status: "0.00%",
          progress: {
            loaded: 0,
            total: file.size,
            startTime: Date.now(),
            lastLoaded: 0,
            lastTime: Date.now(),
            speedSamples: [],
          },
        })
        return newStatus
      })

      // Store abort controller for cancellation
      abortControllers.set(path, controller)

      try {
        // Start file upload with progress tracking
        await uploadFile.mutateAsync([
          maipl.client,
          {
            file,
            maipl_folder: props.folder,
            meta: await File.discoverMeta(file),
            path,
            tag,
          },
          // Progress callback
          (pevent) => {
            if (controller.signal.aborted) return
            setStatus((status) => {
              const currentTime = Date.now()
              const existingStatus = status.get(path)

              if (
                existingStatus?.status === "cancelled" ||
                existingStatus?.status === "error"
              ) {
                return status
              }

              const progress = existingStatus?.progress ?? {
                loaded: 0,
                total: pevent.total ?? 0,
                startTime: currentTime,
                lastLoaded: 0,
                lastTime: currentTime,
                speedSamples: [],
              }

              const currentSpeed =
                (pevent.loaded - progress.loaded) /
                ((currentTime - progress.lastTime) / 1000)

              const speedSamples = [...progress.speedSamples, currentSpeed]
                .slice(-5)
                .filter((s) => !isNaN(s) && isFinite(s))

              return {
                status:
                  pevent.total == null
                    ? "..."
                    : `${((pevent.loaded / pevent.total) * 100).toFixed(2)}%`,
                progress: {
                  loaded: pevent.loaded,
                  total: pevent.total ?? 0,
                  startTime: progress.startTime,
                  lastLoaded: progress.loaded,
                  lastTime: currentTime - 1000,
                  speedSamples,
                },
              }
            })
          },
          controller.signal,
        ])
      } finally {
        // Clean up abort controller after upload
        abortControllers.delete(path)
      }
    },
    [maipl, props.folder, tag, uploadFile]
  )

  // Add type for error response
  type FileErrorResponse = {
    code: string
    message: string
    path: string
    type: string
  }

  // Add function to check for existing files
  const checkExistingFiles = R.useCallback(
    async (files: DZ.FileWithPath[]) => {
      try {
        // Get the list of existing files in the folder
        const response = await File.list(maipl.client, {
          maipl_folder: props.folder,
          path: files.map((f) => f.path ?? f.name).join(","),
        })

        // Create a map of existing file paths
        return new Map(response.data.map((file) => [file.path, file]))
      } catch (error) {
        console.error("Error checking existing files:", error)
        return new Map()
      }
    },
    [maipl.client, props.folder]
  )

  // checkbox enabled?
  const rowCanSelect = R.useCallback(
    (file: FileState) =>
      uploadMutation.isIdle && status.get(file.path) !== "ok",
    [uploadMutation, status]
  )

  const handleCancel = R.useCallback(
    (path: string) => {
      const controller = abortControllers.get(path)
      if (controller) {
        setActionStates((states) => {
          const newStates = new Map(states)
          newStates.set(path, "cancelling")
          return newStates
        })
        setStatus((status) => {
          const newStatus = new Map(status)
          newStatus.set(path, { status: "cancelling" })
          return newStatus
        })
        controller.abort()
      }
    },
    [abortControllers]
  )

  // Update handleRetry to be simpler
  const handleRetry = R.useCallback(
    (path: string) => {
      const file = sortedFiles.find((f) => (f.path ?? f.name) === path)
      if (file) {
        setActionStates((states) => {
          const newStates = new Map(states)
          newStates.set(path, "uploading")
          return newStates
        })
        setStatus((status) => {
          const newStatus = new Map(status)
          newStatus.set(path, {
            status: "0.00%",
            progress: {
              loaded: 0,
              total: file.size,
              startTime: Date.now(),
              lastLoaded: 0,
              lastTime: Date.now(),
              speedSamples: [],
            },
          })
          return newStatus
        })
        uploadSingleFile(file)
      }
    },
    [sortedFiles, uploadSingleFile]
  )

  // Create separate column definitions for status-dependent and action columns
  const getStatusColumns = (status: UploadStatus) => [
    column.accessor("status", {
      header: "Status",
      cell: (info) => {
        const fileStatus = status.get(info.row.original.path)
        return (
          <M.Stack sx={{ width: 100 }}>
            <UploadStatus status={fileStatus?.status ?? "none"} />
          </M.Stack>
        )
      },
    }),
    column.accessor((row) => status.get(row.path), {
      id: "speed",
      header: "Progress",
      cell: (info) => {
        const fileStatus = status.get(info.row.original.path)
        if (
          !fileStatus?.progress ||
          fileStatus.status === "ok" ||
          fileStatus.status === "error"
        ) {
          return null
        }
        const { loaded, total, lastLoaded, lastTime, speedSamples } =
          fileStatus.progress
        const currentTime = Date.now()

        // Calculate current speed
        const currentSpeed =
          (loaded - lastLoaded) / ((currentTime - lastTime) / 1000)

        // Get average speed from samples
        const avgSpeed =
          speedSamples.length > 0
            ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
            : currentSpeed

        const remainingBytes = total - loaded
        const remainingTime = avgSpeed > 0 ? remainingBytes / avgSpeed : 0

        return (
          <M.Stack
            direction="row"
            spacing={1}
            alignItems="center"
            divider={<M.Divider orientation="vertical" flexItem />}
          >
            <M.Typography variant="caption" sx={{ minWidth: 70 }}>
              {F.filesize(avgSpeed)}/s
            </M.Typography>
            <M.Typography variant="caption" sx={{ minWidth: 80 }}>
              {remainingTime > 0
                ? `${formatDuration(remainingTime)} left`
                : "Completing..."}
            </M.Typography>
          </M.Stack>
        )
      },
    }),
  ]

  const getActionColumn = (
    actionStates: Map<string, ActionState>,
    handleCancel: (path: string) => void,
    handleRetry: (path: string) => void
  ) =>
    column.accessor("path", {
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const path = info.row.original.path
        const state = actionStates.get(path) ?? "none"

        return (
          <M.Box sx={{ minWidth: 100 }}>
            <ActionButton
              state={state}
              onCancel={() => handleCancel(path)}
              onRetry={() => handleRetry(path)}
            />
          </M.Box>
        )
      },
    })

  const columns = R.useMemo(
    () => [
      column.accessor("id", {
        header: "Id",
      }),
      column.accessor("path", {
        header: "Path",
      }),
      column.accessor("size", {
        header: "Size",
        cell: (ctx) => F.filesize(ctx.getValue()),
      }),
      ...getStatusColumns(status),
      getActionColumn(actionStates, handleCancel, handleRetry),
    ],
    [status, actionStates, handleCancel, handleRetry]
  )

  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography
          children={`${table.selection.size} files to be uploaded (${F.filesize(
            props.files.reduce(
              (r, f) =>
                table.selection.has(f.path ?? f.name) ? r + f.size : r,
              0
            )
          )})`}
          variant="h5"
        />
        <AcceptedFiles
          {...table}
          columns={columns}
          rows={sortedFiles.map((file) => {
            const fileStatus = status.get(file.path ?? file.name)
            return {
              id: file.path ?? file.name,
              name: file.name,
              path: file.path ?? file.name,
              size: file.size,
              status:
                fileStatus?.status ??
                (table.selection.has(file.path ?? file.name)
                  ? "pending"
                  : "none"),
            }
          })}
          rowCanSelect={rowCanSelect}
          visibility={{
            id: false,
          }}
        />
        <M.Stack direction="row">
          <M.TextField
            disabled={uploadMutation.isPending}
            label="Tag (optional)"
            onChange={(e) => setTag(e.currentTarget.value)}
            value={tag}
          />
          <M.Stack flexGrow={1} />
          <M.Button
            children={uploadMutation.isPending ? "Cancel" : "Close"}
            onClick={props.onClose} // todo: implement cancel and abort upload
          />
          <M.Button
            children={uploadMutation.isPending ? "Please wait ..." : "Upload"}
            disabled={uploadMutation.isPending || table.selection.size == 0}
            onClick={onUpload}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}

// Component for displaying file type icons in the dropzone
function UploadIcon(props: {
  icon: typeof M.SvgIcon
  label: string
  size?: number
}) {
  return (
    <M.Stack
      alignItems="center"
      justifyContent="center"
      sx={{
        height: props.size ?? 128,
        width: props.size ?? 128,
        backgroundColor: "#eee",
      }}
    >
      <props.icon sx={{ fontSize: (props.size ?? 128) / 2 }} />
      <M.Typography
        children={props.label}
        sx={{
          fontFamily: props.label.startsWith(".") ? "monospace" : "inherit",
        }}
      />
    </M.Stack>
  )
}

// Component for displaying upload status chips
function UploadStatus(props: { status: string }) {
  switch (props.status) {
    case "none":
      return <></>
    case "error":
      return <M.Chip color="error" label="Error" />
    case "pending":
      return <M.Chip color="warning" label="Pending" />
    case "ok":
      return <M.Chip color="success" label="Ok" />
    case "cancelled":
      return <M.Chip color="default" label="Cancelled" />
    case "cancelling":
      return (
        <M.Chip
          color="default"
          label="Cancelling"
          icon={<M.CircularProgress size={16} />}
        />
      )
    case "duplicate":
      return <M.Chip color="warning" label="Already exists" />
    default:
      return <M.Chip label={props.status} color="info" />
  }
}
