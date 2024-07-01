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
import ChartsPanel from "./ChartsPanel"

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

export const element = <Output />

export const loader = (_maipl: MR.t_context) =>
  (async ({ request }) => {
    // query params
    const url = new URL(request.url)
    const search = url.searchParams
    return parseParams(search)
  }) satisfies RR.LoaderFunction

function parseParams(search: URLSearchParams) {
  const folder = File.t_maipl_folder.metrics
  const path = search.get("path") ?? "metrics"
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
      queryClient.refetchQueries({ queryKey: ["files"] })
    }
  }

  const onGenerate = async () => {}

  return (
    <M.Stack direction='row'>
      <MR.ActionButton
        children={<I.Folder />}
        component={RR.Link}
        disabled={fileContext.selection.size == 0}
        title='Compare Metrics'
        to={{
          pathname: "share",
          search: RR.useLocation().search,
        }}
      />
      <MR.ActionButton
        children={<I.Share />}
        component={RR.Link}
        disabled={fileContext.selection.size == 0}
        title='Share Files'
        to={{
          pathname: "share",
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
        children='Download'
        component={M.Link}
        download={props.file.basename}
        href={props.file.file}
        rel='noreferrer'
        target='_blank'
        underline='none'
      />
      <M.Divider />
      <M.MenuItem
        component={RR.Link}
        disabled={!isEditable}
        to={`${props.file.id}/edit`}
        children='Edit'
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

export default function Output(props: { sx?: M.SxProps }) {
  const qs = RRT.useLoaderData<UseLoaderData>()
  const setSearch = RR.useSearchParams()[1]
  const { selection, setSelection } = MR.Files.useTable()
  const [isFullWidth, setIsFullWidth] = R.useState(false)

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
        MR.Files.column.accessor("shared_to", {
          header: "Share",
          cell: (info) => <ShareAvatars file={info.row.original} />,
        }),
        MR.Files.column.display({
          id: "actions",
          header: "",
          cell: (info) => <FileActions file={info.row.original} />,
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
        id='container'
        sx={{
          display: "flex",
          flexDirection: "row",
          height: "100vh", 
          margin: 0, 
          padding: 0, 
          overflow: "hidden", 
        }}
      >
        <M.Stack
          id='files'
          sx={{
            flexGrow: isFullWidth ? 0 : 1,
            flexBasis: isFullWidth ? "0%" : "50%", 
            transition:
              "flex-basis 0.3s ease-in-out, flex-grow 0.3s ease-in-out",
            overflow: "auto",
          }}
        >
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
            <M.Stack direction='row' id='searchFields'>
              <M.TextField
                label='Path'
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
                placeholder='path/to/folder'
                value={qs.path}
              />
              <M.TextField
                label='Tag'
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
                placeholder='my-tag'
                value={qs.tag}
              />
              <MR.Picker
                label='Shared'
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
              <SelectionActions
                selection={selection}
                setSelection={setSelection}
              />
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
            />
          </M.Stack>
        </M.Stack>
        <M.Stack
          id='visualization'
          sx={{
            flexGrow: isFullWidth ? 1 : 0,
            flexBasis: isFullWidth ? "100%" : "50%",
            transition:
              "flex-basis 0.3s ease-in-out, flex-grow 0.3s ease-in-out",
          }}
        >
          <ChartsPanel
            selection={selection}
            isFullWidth={isFullWidth}
            setIsFullWidth={setIsFullWidth}
          />
        </M.Stack>
      </M.Stack>
    </Context.Provider>
  )
}
