import { File } from "@maipl/api"
import * as JS from "@maipl/js"
import * as MR from "@maipl/react"
import * as Tree from "@maipl/tree"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"

type Context = {
  selection: Selection
}

type LoaderData = Awaited<ReturnType<UseLoaderData>>

type UseLoaderData = ReturnType<typeof loader>

type Selection = ReturnType<typeof MR.Files.useTable>["selection"]

type SetSelection = ReturnType<typeof MR.Files.useTable>["setSelection"]

const defaultContext: Context = {
  selection: new Map(),
}

const Context = R.createContext(defaultContext)

export const useContext = () => R.useContext(Context)

export const element = <Files />

export const loader = (_maipl: MR.t_context) =>
  (async ({ request }) => {
    // query params
    const url = new URL(request.url)
    const search = url.searchParams
    return parseParams(search)
  }) satisfies RR.LoaderFunction

function parseParams(search: URLSearchParams) {
  const folder = search.get("folder") ?? File.t_maipl_folder.raw
  const path = search.get("path") ?? ""
  const tag = search.get("tag") ?? ""
  const shared = search.get("shared") ?? File.t_filter_shared.all
  const page = Number.parseInt(search.get("page") ?? "1")
  const size = Number.parseInt(search.get("size") ?? "25")
  JS.invariantEnum(folder, File.t_maipl_folder, "File.t_maipl_folder")
  JS.invariantEnum(shared, File.t_filter_shared, "File.t_filter_shared")
  JS.invariant(!Number.isNaN(page), "page must be a number")
  JS.invariant(!Number.isNaN(size), "size must be a number")
  return { folder, path, tag, shared, page, size }
}

function SelectionActions(props: {
  selection: Selection
  setSelection: SetSelection
}) {
  const { client, user } = MR.useMaipl()
  const queryClient = RQ.useQueryClient()
  const fileContext = useContext()
  const [showDeleteConfirm, setShowDeleteConfirm] = R.useState(false)

  const onDelete = async () => {
    const deletableFiles = Array.from(props.selection.entries()).filter(([_, file]) => 
      file.owner.id === user?.id && !file.in_use
    )

    if (deletableFiles.length === 0) {
      setShowDeleteConfirm(false)
      return
    }

    await File.delete(client, deletableFiles.map(([id]) => id))
    props.setSelection(new Map())
    queryClient.refetchQueries({ queryKey: ["files"] })
    setShowDeleteConfirm(false)
  }

  const files = Array.from(props.selection.entries())
  const nonDeletableFiles = files.filter(([_, file]) => 
    file.owner.id !== user?.id || file.in_use
  )
  const deletableFiles = files.filter(([_, file]) => 
    file.owner.id === user?.id && !file.in_use
  )

  return (
    <>
      <M.Stack direction="row">
        <MR.ActionButton
          children={<I.Share />}
          component={RR.Link}
          disabled={fileContext.selection.size == 0}
          title="Share Files"
          to={{
            pathname: "share",
            search: RR.useLocation().search,
          }}
        />
        <MR.ActionButton
          children={<I.DriveFolderUpload />}
          component={RR.Link}
          title="Upload Files"
          to={{
            pathname: "upload",
            search: RR.useLocation().search,
          }}
        />
        <MR.ActionButton
          children={<I.NoteAdd />}
          component={RR.Link}
          title="Create new file"
          to={{
            pathname: "new",
            search: RR.useLocation().search,
          }}
        />
        <MR.ActionButton
          children={<I.DeleteForever />}
          disabled={props.selection.size == 0}
          onClick={() => setShowDeleteConfirm(true)}
          title={
            props.selection.size == 0
              ? "Delete"
              : `Delete ${props.selection.size} files`
          }
        />
      </M.Stack>

      <M.Modal 
        open={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        aria-labelledby="delete-confirmation-modal"
      >
        <M.Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <M.Stack spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
            <M.Stack direction="row" justifyContent="space-between" alignItems="center">
              <M.Typography variant="h6" id="delete-confirmation-modal">Delete Files</M.Typography>
              <M.IconButton onClick={() => setShowDeleteConfirm(false)}>
                <I.Close />
              </M.IconButton>
            </M.Stack>
            <M.Divider />

            <M.Box sx={{ overflow: 'auto', flex: 1 }}>
              {nonDeletableFiles.length > 0 && (
                <M.Stack spacing={1}>
                  <M.Typography variant="subtitle2" color="error">
                    Cannot Delete ({nonDeletableFiles.length})
                  </M.Typography>
                  <M.Box sx={{ pl: 2 }}>
                    {nonDeletableFiles.map(([_, file], i) => {
                      const isOwner = file.owner.id === user?.id
                      const reason = isOwner ? "In use" : "Not owner"
                      return (
                        <M.Typography 
                          key={i} 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            fontFamily: "monospace",
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                          }}
                        >
                          {file.path}
                          <M.Chip
                            icon={<I.Cancel />}
                            label={reason}
                            color="error"
                            size="small"
                          />
                        </M.Typography>
                      )
                    })}
                  </M.Box>
                </M.Stack>
              )}

              {deletableFiles.length > 0 && (
                <M.Stack spacing={1}>
                  <M.Typography variant="subtitle2" color="success.main">
                    Can Delete ({deletableFiles.length})
                  </M.Typography>
                  <M.Box sx={{ pl: 2 }}>
                    {deletableFiles.map(([_, file], i) => (
                      <M.Typography 
                        key={i} 
                        variant="body2" 
                        sx={{ 
                          fontFamily: "monospace",
                          display: "flex",
                          alignItems: "center",
                          gap: 1
                        }}
                      >
                        {file.path}
                        <M.Chip
                          icon={<I.CheckCircle />}
                          label="Can be deleted"
                          color="success"
                          size="small"
                        />
                      </M.Typography>
                    ))}
                  </M.Box>
                </M.Stack>
              )}
            </M.Box>

            <M.Divider />
            <M.Stack direction="row" spacing={2} justifyContent="flex-end">
              <M.Button
                onClick={() => setShowDeleteConfirm(false)}
                children="Cancel"
              />
              <M.Button
                onClick={onDelete}
                variant="contained"
                color="error"
                disabled={deletableFiles.length === 0}
                children="Delete Selected"
              />
            </M.Stack>
          </M.Stack>
        </M.Box>
      </M.Modal>
    </>
  )
}

function FileActions(props: { file: File.t }) {
  // todo: not all files should be editable
  // this is a basic filter for now. maybe use mime types?
  const isEditable =
    props.file.extname != ".wav" &&
    props.file.extname != ".mp3" &&
    props.file.extname != ".ogg"
  
  const [showDetails, setShowDetails] = R.useState(false)

  return (
    <>
      <MR.Menu icon={<I.Settings />}>
        <M.MenuItem
          children="Download"
          component={M.Link}
          download={props.file.basename}
          href={props.file.file}
          rel="noreferrer"
          target="_blank"
          underline="none"
        />
        <M.Divider />
        <M.MenuItem
          component={RR.Link}
          disabled={!isEditable}
          to={`${props.file.id}/edit`}
          children="Edit"
        />
        <M.MenuItem
          onClick={() => setShowDetails(true)}
          children="Details"
        />
      </MR.Menu>

      <M.Modal 
        open={showDetails} 
        onClose={() => setShowDetails(false)}
        aria-labelledby="file-details-modal"
      >
        <M.Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          maxHeight: '80vh',
          overflow: 'auto',
        }}>
          <M.Stack spacing={2}>
            <M.Stack direction="row" justifyContent="space-between" alignItems="center">
              <M.Typography variant="h6" id="file-details-modal">File Details</M.Typography>
              <M.IconButton onClick={() => setShowDetails(false)}>
                <I.Close />
              </M.IconButton>
            </M.Stack>
            <M.Divider />
            <M.Stack spacing={1}>
              <M.Typography variant="subtitle2">Basic Information</M.Typography>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Name:</M.Typography>
                <M.Typography variant="body2">{props.file.basename}</M.Typography>
              </M.Stack>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Path:</M.Typography>
                <M.Typography variant="body2">{props.file.path}</M.Typography>
              </M.Stack>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Size:</M.Typography>
                <M.Typography variant="body2">{(props.file.size / (1024 * 1024)).toFixed(2)} MB</M.Typography>
              </M.Stack>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Created:</M.Typography>
                <M.Typography variant="body2">{new Date(props.file.created_at).toLocaleString()}</M.Typography>
              </M.Stack>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Updated:</M.Typography>
                <M.Typography variant="body2">{new Date(props.file.updated_at).toLocaleString()}</M.Typography>
              </M.Stack>
            </M.Stack>

            <M.Stack spacing={1}>
              <M.Typography variant="subtitle2">Audio Information</M.Typography>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Duration:</M.Typography>
                <M.Typography variant="body2">
                  {File.safeMeta(props.file, "audio", "duration", 0)?.toFixed(2) ?? "-"} seconds
                </M.Typography>
              </M.Stack>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Channels:</M.Typography>
                <M.Typography variant="body2">
                  {File.safeMeta(props.file, "audio", "channels", 0) ?? "-"}
                </M.Typography>
              </M.Stack>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Sample Rate:</M.Typography>
                <M.Typography variant="body2">
                  {File.safeMeta(props.file, "audio", "sample_rate", 0) ? `${File.safeMeta(props.file, "audio", "sample_rate", 0)} Hz` : "-"}
                </M.Typography>
              </M.Stack>
            </M.Stack>

            <M.Stack spacing={1}>
              <M.Typography variant="subtitle2">Sharing Information</M.Typography>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Owner:</M.Typography>
                <M.Typography variant="body2">{props.file.owner.first_name} {props.file.owner.last_name}</M.Typography>
              </M.Stack>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">Shared With:</M.Typography>
                <M.Typography variant="body2">
                  {props.file.shared_to.length > 0 
                    ? props.file.shared_to.map(user => `${user.first_name} ${user.last_name}`).join(", ")
                    : "No one"}
                </M.Typography>
              </M.Stack>
            </M.Stack>

            <M.Stack spacing={1}>
              <M.Typography variant="subtitle2">Technical Information</M.Typography>
              <M.Stack direction="row" spacing={2}>
                <M.Typography variant="body2" color="text.secondary">SHA256:</M.Typography>
                <M.Typography variant="body2" sx={{ fontFamily: "monospace" }}>{props.file.sha256}</M.Typography>
              </M.Stack>
            </M.Stack>
          </M.Stack>
        </M.Box>
      </M.Modal>
    </>
  )
}

function ShareAvatars(props: { file: File.t }) {
  const maipl = MR.useMaipl()
  const isOwner = props.file.user_id === maipl.user?.id
  
  return (
    <M.Tooltip title={isOwner ? "You own this file" : "Shared with you"}>
      <M.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MR.UserAvatarGroup
          users={
            isOwner
              ? props.file.shared_to
              : [props.file.owner]
          }
        />
        {isOwner ? (
          <M.Chip
            icon={<I.Person />}
            label="Owner"
            size="small"
            color="primary"
            variant="outlined"
          />
        ) : (
          <M.Chip
            icon={<I.People />}
            label="Shared"
            size="small"
            color="secondary"
            variant="outlined"
          />
        )}
      </M.Box>
    </M.Tooltip>
  )
}

export default function Files(props: { sx?: M.SxProps }) {
  const qs = RRT.useLoaderData<UseLoaderData>()
  const setSearch = RR.useSearchParams()[1]
  const { selection, setSelection, updateTag } = MR.Files.useTable()

  // Add debounce hook
  const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = R.useState<T>(value)

    R.useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)

      return () => {
        clearTimeout(handler)
      }
    }, [value, delay])

    return debouncedValue
  }

  // Add state for path and tag inputs
  const [pathInput, setPathInput] = R.useState(qs.path)
  const [tagInput, setTagInput] = R.useState(qs.tag)

  // Debounce the input values
  const debouncedPath = useDebounce(pathInput, 1000)
  const debouncedTag = useDebounce(tagInput, 1000)

  // Update search params when debounced values change
  R.useEffect(() => {
    setState(
      {
        ...qs,
        path: debouncedPath,
        page: 1,
        size: qs.size,
      },
      { replace: true }
    )
  }, [debouncedPath])

  R.useEffect(() => {
    setState(
      {
        ...qs,
        tag: debouncedTag,
        page: 1,
        size: qs.size,
      },
      { replace: true }
    )
  }, [debouncedTag])

  function setState(value: LoaderData, options?: RR.NavigateOptions) {
    setSearch(
      {
        folder: value.folder,
        path: value.path,
        tag: value.tag,
        shared: value.shared,
        page: String(value.page),
        size: String(value.size),
      },
      options
    )
  }

  const extraColumns = R.useMemo(
    () =>
      [
        MR.Files.column.accessor(
          (file) => File.safeMeta(file, "audio", "duration", 0),
          {
            id: "duration",
            header: "Duration",
            cell: (info) => {
              const value = info.getValue()
              return value ? `${value.toFixed(2)} sec` : "-"
            },
            size: 100,
          }
        ),
        MR.Files.column.accessor(
          (file) => File.safeMeta(file, "audio", "channels", 0),
          {
            id: "channels",
            header: "Channels",
            cell: (info) => info.getValue(),
            size: 100,
          }
        ),
        MR.Files.column.accessor(
          (file) => File.safeMeta(file, "audio", "sample_rate", 0),
          {
            id: "sample_rate",
            header: "Rate",
            cell: (info) => {
              const value = info.getValue()
              return value ? `${value} Hz` : "-"
            },
            size: 100,
          }
        ),
        MR.Files.column.accessor("shared_to", {
          id: "shared_with",
          header: "Shared With",
          cell: (info) => (
            <M.Box sx={{ display: "flex", justifyContent: "center" }}>
              <MR.UserAvatarGroup users={info.getValue()} />
            </M.Box>
          ),
          size: 100,
        }),
        MR.Files.column.accessor("user_id", {
          id: "ownership",
          header: "Ownership",
          cell: (info) => {
            const maipl = MR.useMaipl()
            const isOwner = info.getValue() === maipl.user?.id
            return (
              <M.Box sx={{ display: "flex", justifyContent: "center" }}>
                <M.Chip
                  icon={isOwner ? <I.Person /> : <I.People />}
                  label={isOwner ? "Owned" : "Shared"}
                  size="small"
                  color={isOwner ? "primary" : "secondary"}
                  variant="outlined"
                />
              </M.Box>
            )
          },
          size: 50,
        }),
        MR.Files.column.accessor("in_use", {
          id: "in_use",
          header: "In Use",
          cell: (info) => (
            <M.Box sx={{ display: "flex", justifyContent: "center" }}>
              {info.getValue() ? (
                <I.CheckCircle color="success" />
              ) : (
                <I.Cancel color="error" />
              )}
            </M.Box>
          ),
          size: 30,
        }),
        MR.Files.column.display({
          id: "actions",
          header: "",
          cell: (info) => (
            <M.Box sx={{ display: "flex", justifyContent: "center" }}>
              <FileActions file={info.row.original} />
            </M.Box>
          ),
          size: 50,
        }),
      ] as Array<MR.ColumnDef<File.t>>,
    []
  )

  const { data: files } = MR.Files.useQuery({
    maipl_folder: qs.folder,
    path: qs.path,
    tag: qs.tag,
    page: qs.page,
    size: qs.size,
    shared: qs.shared,
  })

  return (
    <Context.Provider value={{ selection }}>
      <M.Stack
        sx={{
          flexGrow: 1,
          maxHeight: "100%",
          overflow: "hidden",
          padding: 2,
          ...props.sx,
        }}
      >
        <RR.Outlet />
        <M.Stack direction="row">
          <MR.Picker
            label="Folder"
            setValue={(folder) => {
              if (folder) {
                JS.invariantEnum(
                  folder,
                  File.t_maipl_folder,
                  "File.t_maipl_folder"
                )
                setState(
                  { ...qs, folder, page: 1, size: qs.size },
                  { replace: true }
                )
              }
            }}
            value={qs.folder}
            values={[
              File.t_maipl_folder.annotation,
              File.t_maipl_folder.config,
              File.t_maipl_folder.dataset,
              File.t_maipl_folder.model,
              File.t_maipl_folder.raw,
              File.t_maipl_folder.metrics,
              File.t_maipl_folder.recipe,
            ]}
          />
          <M.TextField
            label="Path"
            onChange={(e) => setPathInput(e.currentTarget.value)}
            placeholder="path/to/folder"
            value={pathInput}
            InputProps={{
              endAdornment: pathInput ? (
                <M.InputAdornment position="end">
                  <M.IconButton
                    size="small"
                    onClick={() => setPathInput("")}
                    title="Clear path"
                  >
                    <I.Clear />
                  </M.IconButton>
                </M.InputAdornment>
              ) : null,
            }}
          />
          <M.TextField
            label="Tag"
            onChange={(e) => setTagInput(e.currentTarget.value)}
            placeholder="my-tag"
            value={tagInput}
            InputProps={{
              endAdornment: tagInput ? (
                <M.InputAdornment position="end">
                  <M.IconButton
                    size="small"
                    onClick={() => setTagInput("")}
                    title="Clear tag"
                  >
                    <I.Clear />
                  </M.IconButton>
                </M.InputAdornment>
              ) : null,
            }}
          />
          <MR.Picker
            label="Shared"
            setValue={(shared) => {
              if (shared) {
                JS.invariantEnum(
                  shared,
                  File.t_filter_shared,
                  "File.t_filter_shared"
                )
                setState(
                  { ...qs, shared, page: 1, size: qs.size },
                  { replace: true }
                )
              }
            }}
            value={qs.shared}
            values={{
              All: File.t_filter_shared.all,
              Shared: File.t_filter_shared.public,
              Private: File.t_filter_shared.private,
            }}
          />
          <M.Stack flexGrow={1} />
          <SelectionActions selection={selection} setSelection={setSelection} />
        </M.Stack>
        <MR.Files.Table
          columns={extraColumns}
          rows={files.data}
          count={files.count}
          pagination={{
            pageIndex: qs.page - 1,
            pageSize: qs.size,
          }}
          selection={selection}
          setPagination={(value) => {
            if (typeof value == "function") {
              const m = value({ pageIndex: qs.page - 1, pageSize: qs.size })
              setState({
                ...qs,
                page: m.pageIndex + 1,
                size: m.pageSize,
              })
            } else {
              setState({
                ...qs,
                page: value.pageIndex + 1,
                size: value.pageSize,
              })
            }
          }}
          setSelection={setSelection}
          visibility={{
            basename: false,
            dirname: false,
            extname: false,
            channels: false,
            sample_rate: false,
            user_id: false,
          }}
          meta={{
            onTagUpdate: updateTag,
          }}
        />
      </M.Stack>
    </Context.Provider>
  )
}
