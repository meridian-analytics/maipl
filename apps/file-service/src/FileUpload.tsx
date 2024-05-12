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
      return <FileUpload folder={folder} onClose={onClose} disabled={true} />
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
  }
}

export default function FileUpload(props: {
  accept?: DZ.Accept
  disabled?: boolean
  folder: File.t_maipl_folder
  onClose: () => void
  text?: string
  validator?: DZ.DropzoneOptions["validator"]
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
    [dz.isFocused, dz.isDragAccept, dz.isDragReject],
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
                  exts.map(e => (
                    <UploadIcon
                      icon={I.InsertDriveFileOutlined}
                      key={e}
                      label={e}
                    />
                  )),
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

function FileUploadStep2(props: {
  files: Array<DZ.FileWithPath>
  folder: File.t_maipl_folder
  onClose: () => void
}) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  // state
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
          cell: ctx => F.filesize(ctx.getValue()),
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

  // sorted files
  const sortedFiles = R.useMemo(
    () =>
      [...props.files].sort((a, b) =>
        (a.path ?? a.name).localeCompare(b.path ?? b.name),
      ),
    [props.files],
  )

  // event handlers
  const onUpload = () => {
    if (uploadMutation.isIdle) {
      return uploadMutation.mutateAsync()
    }
  }

  // mutations
  const uploadFile = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onError: (err, vars) => {
      if (import.meta.env["DEV"]) {
        console.error("FileUpload uploadMutation error", err, vars)
      }
      setStatus(status => new Map(status).set(vars[1].path, "error"))
    },
    onSettled: () => {
      uploadFile.reset()
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
            file =>
              table.selection.has(file.path ?? file.name) &&
              status.get(file.path ?? file.name) !== "ok",
          )
          .map(file =>
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
      if (import.meta.env["DEV"]) {
        console.error("FileUpload uploadMutation error", error, vars)
      }
    },
    onSettled: () => {
      uploadMutation.reset()
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
      queryClient.refetchQueries({ queryKey: ["files"] })
    },
  })

  // checkbox enabled?
  const rowCanSelect = R.useCallback(
    (file: FileState) =>
      uploadMutation.isIdle && status.get(file.path) !== "ok",
    [uploadMutation, status],
  )

  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography
          children={`${table.selection.size} files to be uploaded (${F.filesize(
            props.files.reduce(
              (r, f) =>
                table.selection.has(f.path ?? f.name) ? r + f.size : r,
              0,
            ),
          )})`}
          variant="h5"
        />
        <AcceptedFiles
          {...table}
          columns={columns}
          rows={sortedFiles.map(file => ({
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
        <M.Stack direction="row">
          <M.TextField
            disabled={uploadMutation.isPending}
            label="Tag (optional)"
            onChange={e => setTag(e.currentTarget.value)}
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
    default:
      return <M.Chip label={props.status} color="info" />
  }
}
