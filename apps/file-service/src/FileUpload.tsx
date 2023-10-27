import { File } from "@maipl/api"
import { filesize } from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import * as R from "react"
import * as DZ from "react-dropzone"

const style = {
  base: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    borderWidth: 2,
    borderRadius: 2,
    borderColor: "#eeeeee",
    borderStyle: "dashed",
    backgroundColor: "#fafafa",
    color: "#bdbdbd",
    outline: "none",
    transition: "border .24s ease-in-out",
  },
  focused: {
    borderColor: "#2196f3",
  },
  accept: {
    borderColor: "#00e676",
  },
  reject: {
    borderColor: "#ff1744",
  },
}

type UploadStatus = Map<string, string> // path -> status

type FileState = {
  id: string
  name: string
  path: string
  size: number
  status: string
}

const column = RT.createColumnHelper<FileState>()

const AcceptedFiles = MR.Table<FileState, string>()

export default function FileUpload(props: {
  folder: File.t_maipl_folder
  onClose: () => void
}) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const [tag, setTag] = R.useState("")
  const [status, setStatus] = R.useState<UploadStatus>(() => new Map())

  // table
  const table = MR.useTable<FileState, string>()
  const columns = R.useMemo(
    () =>
      [
        column.accessor("id", {
          header: "Id",
        }),
        column.accessor("path", {
          header: "Path",
        }),
        column.accessor("size", {
          header: "Size",
          cell: ctx => filesize(ctx.getValue()),
        }),
        column.accessor("status", {
          header: "Status",
          cell: info => (
            <M.Stack sx={{ width: 70 }}>
              <UploadStatus status={info.getValue()} />
            </M.Stack>
          ),
        }),
      ] as Array<MR.ColumnDef<FileState>>,
    [],
  )

  // dropzone
  const dz = DZ.useDropzone()
  const dzStyle = R.useMemo(
    () => ({
      ...style.base,
      ...(dz.isFocused ? style.focused : {}),
      ...(dz.isDragAccept ? style.accept : {}),
      ...(dz.isDragReject ? style.reject : {}),
    }),
    [dz.isFocused, dz.isDragAccept, dz.isDragReject],
  )

  // sorted files
  const sortedFiles = R.useMemo(
    () =>
      [...dz.acceptedFiles].sort((a: DZ.FileWithPath, b: DZ.FileWithPath) =>
        (a.path ?? a.name).localeCompare(b.path ?? b.name),
      ),
    [dz.acceptedFiles],
  )

  // event handlers
  const onUpload = () => {
    if (uploadMutation.isIdle) {
      return uploadMutation.mutateAsync()
    }
  }

  const uploadFile = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onError: (err, vars) => {
      if (import.meta.env.DEV) {
        console.error("FileUpload uploadMutation error", err, vars)
      }
      setStatus(status => new Map(status).set(vars[1].path, "error"))
    },
    onSuccess: file => {
      setStatus(status => new Map(status).set(file.path, "ok"))
    },
  })

  const uploadMutation = RQ.useMutation({
    mutationFn: () =>
      Promise.allSettled(
        sortedFiles
          .filter(
            (file: DZ.FileWithPath) =>
              table.selection.has(file.path ?? file.name) &&
              status.get(file.path ?? file.name) !== "ok",
          )
          .map((file: DZ.FileWithPath) =>
            maipl.enqueue(async () =>
              uploadFile.mutateAsync([
                maipl.client,
                {
                  file,
                  maipl_folder: props.folder,
                  meta: await File.discoverMeta(file),
                  path: file.path ?? file.name,
                  tag,
                },
                pevent =>
                  setStatus(status =>
                    new Map(status).set(
                      file.path ?? file.name,
                      pevent.total == null
                        ? "..."
                        : `${((pevent.loaded / pevent.total) * 100).toFixed(
                            2,
                          )}%`,
                    ),
                  ),
              ]),
            ),
          ),
      ),
    onError: (error, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: There was an error uploading files
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("FileUpload uploadMutation error", error, vars)
      }
    },
    onSuccess: data => {
      notify(onClose => {
        const count = data.filter(f => f.status == "fulfilled").length
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
      queryClient.refetchQueries(["files"])
    },
  })

  // checkbox enabled?
  const rowCanSelect = R.useCallback(
    (file: FileState) =>
      !uploadMutation.isLoading && status.get(file.path) !== "ok",
    [uploadMutation, status],
  )

  return dz.acceptedFiles.length == 0 ? (
    <MR.Modal onClose={props.onClose}>
      <M.Stack spacing={2}>
        <M.Typography variant="h5" children="Upload Files" />
        <M.Box my={5}>
          <M.Box {...dz.getRootProps({ sx: dzStyle })}>
            <input {...dz.getInputProps()} />
            <M.Typography>
              Drag and drop some files here, or click to select files
            </M.Typography>
          </M.Box>
        </M.Box>
      </M.Stack>
    </MR.Modal>
  ) : (
    <MR.Modal onClose={props.onClose}>
      <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography
          children={`${table.selection.size} files to be uploaded (${filesize(
            dz.acceptedFiles.reduce(
              (r, f: DZ.FileWithPath) =>
                table.selection.has(f.path ?? f.name) ? r + f.size : r,
              0,
            ),
          )})`}
          variant="h5"
        />
        <AcceptedFiles
          {...table}
          columns={columns}
          rows={sortedFiles.map((file: DZ.FileWithPath) => ({
            id: file.path ?? file.name,
            name: file.name,
            path: file.path ?? file.name,
            size: file.size,
            status:
              status.get(file.path ?? file.name) ??
              (table.selection.has(file.path ?? file.name)
                ? "pending"
                : "none"),
          }))}
          rowCanSelect={rowCanSelect}
          visibility={{
            id: false,
          }}
        />
        <M.Stack direction="row" spacing={2}>
          <M.TextField
            disabled={uploadMutation.isLoading}
            label="Tag (optional)"
            onChange={e => setTag(e.currentTarget.value)}
            size="small"
            value={tag}
            variant="outlined"
          />
          <M.Stack flexGrow={1} />
          <M.Button
            children={uploadMutation.isLoading ? "Cancel" : "Close"}
            onClick={props.onClose} // todo: implement cancel and abord upload
            variant="outlined"
          />
          <M.Button
            children={uploadMutation.isLoading ? "Please wait ..." : "Upload"}
            disabled={uploadMutation.isLoading || table.selection.size == 0}
            onClick={onUpload}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}

function UploadStatus(props: { status: string }) {
  switch (props.status) {
    case "none":
      return <></>
    case "error":
      return <M.Chip color="error" label="Error" size="small" />
    case "pending":
      return (
        <M.Chip
          color="warning"
          label="Pending"
          size="small"
          variant="outlined"
        />
      )
    case "ok":
      return <M.Chip color="success" label="Ok" size="small" />
    default:
      return <M.Chip label={props.status} color="info" size="small" />
  }
}
