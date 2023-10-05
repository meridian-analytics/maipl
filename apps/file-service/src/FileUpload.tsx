import { File } from "@maipl/common/api"
import { useMaipl } from "@maipl/common/context"
import { filesize } from "@maipl/common/format"
import * as MT from "@maipl/common/table"
import { Modal } from "@maipl/common/ui"
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

const AcceptedFiles = MT.Table<FileState, string>()

export default function FileUpload(props: {
  folder: File.t_maipl_folder
  onClose: () => void
}) {
  const queryClient = RQ.useQueryClient()
  const { client, enqueue } = useMaipl()
  const [tag, setTag] = R.useState("")
  const [status, setStatus] = R.useState<UploadStatus>(() => new Map())

  // table
  const table = MT.useTable<FileState, string>()
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
      ] as Array<MT.ColumnDef<FileState>>,
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
        a.path.localeCompare(b.path),
      ),
    [dz.acceptedFiles],
  )

  // event handlers
  const uploadFile = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onSuccess: file => {
      setStatus(status => new Map(status).set(file.path, "ok"))
    },
    onError: (err, vars) => {
      console.error("FileUpload uploadMutation err", err)
      setStatus(status => new Map(status).set(vars[1].path, "error"))
    },
  })

  const onUpload = RQ.useMutation({
    mutationFn: () =>
      Promise.allSettled(
        sortedFiles
          .filter(
            (file: DZ.FileWithPath) =>
              table.selection.has(file.path) && status.get(file.path) !== "ok",
          )
          .map((file: DZ.FileWithPath) =>
            enqueue(async () =>
              uploadFile.mutateAsync([
                client,
                {
                  file,
                  maipl_folder: props.folder,
                  meta: await File.meta(file),
                  path: file.path,
                  tag,
                },
                pevent =>
                  setStatus(status =>
                    new Map(status).set(
                      file.path,
                      `${((pevent.loaded / pevent.total) * 100).toFixed(2)}%`,
                    ),
                  ),
              ]),
            ),
          ),
      ),
    onSuccess: data => {
      console.log("FileUpload onUpload success", data)
    },
    onError: error => {
      console.error("FileUpload onUpload error", error)
    },
    onSettled: () => {
      queryClient.refetchQueries(["files"])
    },
  })

  // checkbox enabled?
  const rowCanSelect = R.useCallback(
    (file: FileState) => !onUpload.isLoading && status.get(file.path) !== "ok",
    [onUpload, status],
  )

  return dz.acceptedFiles.length == 0 ? (
    <Modal onClose={props.onClose}>
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
    </Modal>
  ) : (
    <Modal onClose={props.onClose}>
      <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography
          children={`${table.selection.size} files to be uploaded (${filesize(
            dz.acceptedFiles.reduce(
              (r, f: DZ.FileWithPath) =>
                table.selection.has(f.path) ? r + f.size : r,
              0,
            ),
          )})`}
          variant="h5"
        />
        <AcceptedFiles
          {...table}
          columns={columns}
          rows={sortedFiles.map((file: DZ.FileWithPath) => ({
            id: file.path,
            name: file.name,
            path: file.path,
            size: file.size,
            status:
              status.get(file.path) ??
              (table.selection.has(file.path) ? "pending" : "none"),
          }))}
          rowCanSelect={rowCanSelect}
          visibility={{
            id: false,
          }}
        />
        <M.Stack direction="row" spacing={2}>
          <M.TextField
            disabled={onUpload.isLoading}
            label="Tag (optional)"
            onChange={e => setTag(e.currentTarget.value)}
            size="small"
            value={tag}
            variant="outlined"
          />
          <M.Stack flexGrow={1} />
          <M.Button
            children={onUpload.isLoading ? "Cancel" : "Close"}
            onClick={props.onClose} // todo: implement cancel and abord upload
            variant="outlined"
          />
          <M.Button
            children={onUpload.isLoading ? "Please wait ..." : "Upload"}
            disabled={onUpload.isLoading || table.selection.size == 0}
            onClick={() => onUpload.mutate()}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </Modal>
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
