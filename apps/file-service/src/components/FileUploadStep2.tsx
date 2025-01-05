import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import * as R from "react"
import * as DZ from "react-dropzone"
import { File } from "@maipl/api"
import type {
  FileUploadStep2Props,
  FileState,
  UploadStatus,
  ActionState,
} from "../types"
import { UploadStatus as UploadStatusChip } from "./UploadStatus"
import { ActionButton } from "./ActionButton"

const column = RT.createColumnHelper<FileState>()
const AcceptedFiles = MR.Table<FileState, string>()

// Second step of file upload process - handles actual file uploads
export function FileUploadStep2(props: FileUploadStep2Props) {
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
    mutationFn: (vars: Parameters<typeof File.create>) => {
      const [client, body, onProgress, signal] = vars
      return File.create(client, body, onProgress, signal, {
        timeout: 1800000, // 30 minutes timeout (should be less than server timeout)
      })
    },
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

      // Handle network errors and timeouts
      if (
        err.code === "ERR_NETWORK" ||
        err.code === "ECONNABORTED" ||
        err.response?.status === 504
      ) {
        setActionStates((states) => {
          const newStates = new Map(states)
          newStates.set(vars[1].path, "timeout")
          return newStates
        })
        setStatus((status) => {
          const newStatus = new Map(status)
          newStatus.set(vars[1].path, { status: "timeout" })
          return newStatus
        })

        const timeoutMessage =
          err.code === "ECONNABORTED"
            ? "Client timeout: Upload took too long."
            : err.response?.status === 504
            ? "Server timeout: The server took too long to respond."
            : "Network error: Connection was lost."

        notify((onClose) => (
          <M.Alert onClose={onClose} severity="error">
            {timeoutMessage} Please try again with a smaller file or better
            connection.
          </M.Alert>
        ))
        return
      }

      // Handle 409 Conflict (Duplicate file)
      if (err.response?.status === 409) {
        const errorData = err.response.data
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
          <M.Alert onClose={onClose} severity="warning">
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
              const newStatus = new Map(status)
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

              newStatus.set(path, {
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
              })
              return newStatus
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
            <UploadStatusChip status={fileStatus?.status ?? "none"} />
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

  // Add a function to cancel all uploads
  const handleCancelAll = R.useCallback(() => {
    // Cancel all active uploads
    abortControllers.forEach((controller) => {
      controller.abort()
    })
    // Update status for all files
    setActionStates((states) => {
      const newStates = new Map(states)
      sortedFiles.forEach((file) => {
        const path = file.path ?? file.name
        if (states.get(path) === "uploading") {
          newStates.set(path, "cancelled")
        }
      })
      return newStates
    })
    setStatus((status) => {
      const newStatus = new Map(status)
      sortedFiles.forEach((file) => {
        const path = file.path ?? file.name
        if (status.get(path)?.status === "uploading") {
          newStatus.set(path, { status: "cancelled" })
        }
      })
      return newStatus
    })
    // Close the modal
    props.onClose()
  }, [sortedFiles, abortControllers, props.onClose])

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
            onClick={uploadMutation.isPending ? handleCancelAll : props.onClose}
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

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.ceil(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
}
