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
  const size = Number.parseInt(search.get("size") ?? "100")
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
  const { client } = MR.useMaipl()
  const queryClient = RQ.useQueryClient()
  const fileContext = useContext()

  const onDelete = async () => {
    const message = [
      `Are you sure you want to delete ${props.selection.size} files?`,
      Tree.toString(
        Tree.fromPaths(
          Array.from(props.selection.values(), (file) => file.path)
        )
      ),
    ]

    if (confirm(message.join("\n\n"))) {
      await File.delete(client, Array.from(props.selection.keys()))
      props.setSelection(new Map())
      // bug: how to handle when deleting all items on last page?
      // setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
      queryClient.refetchQueries({ queryKey: ["files"] })
    }
  }

  return (
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
        onClick={onDelete}
        title={
          props.selection.size == 0
            ? "Delete"
            : `Delete ${props.selection.size} files`
        }
      />
    </M.Stack>
  )
}

function FileActions(props: { file: File.t }) {
  // todo: not all files should be editable
  // this is a basic filter for now. maybe use mime types?
  const isEditable =
    props.file.extname != ".wav" &&
    props.file.extname != ".mp3" &&
    props.file.extname != ".ogg"

  return (
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
    </MR.Menu>
  )
}

function ShareAvatars(props: { file: File.t }) {
  const maipl = MR.useMaipl()
  return (
    <MR.UserAvatarGroup
      users={
        props.file.user_id != maipl.user?.id
          ? [props.file.owner]
          : props.file.shared_to
      }
    />
  )
}

export default function Files(props: { sx?: M.SxProps }) {
  const qs = RRT.useLoaderData<UseLoaderData>()
  const setSearch = RR.useSearchParams()[1]
  const { selection, setSelection, updateTag } = MR.Files.useTable()

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
          header: "Share",
          cell: (info) => (
            <M.Box sx={{ display: "flex", justifyContent: "center" }}>
              <ShareAvatars file={info.row.original} />
            </M.Box>
          ),
          size: 50,
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
            onChange={(e) =>
              setState(
                {
                  ...qs,
                  path: e.currentTarget.value,
                  page: 1,
                  size: qs.size,
                },
                { replace: true }
              )
            }
            placeholder="path/to/folder"
            value={qs.path}
          />
          <M.TextField
            label="Tag"
            onChange={(e) =>
              setState(
                {
                  ...qs,
                  tag: e.currentTarget.value,
                  page: 1,
                  size: qs.size,
                },
                { replace: true }
              )
            }
            placeholder="my-tag"
            value={qs.tag}
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
