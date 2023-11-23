import { File } from "@maipl/api"
import * as MR from "@maipl/react"
import * as Tree from "@maipl/tree"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"

export const element = <Files />

export const loader = (_maipl: MR.t_context) =>
  (async ({ request }) => {
    // folder query param
    const url = new URL(request.url)
    const search = url.searchParams
    const folder = search.get("folder") ?? "public"
    File.invariantMaiplFolder(folder)
    // payload
    return { folder }
  }) satisfies RR.LoaderFunction

function SelectionActions(props: {
  selection: ReturnType<typeof MR.Files.useTable>["selection"]
  setSelection: ReturnType<typeof MR.Files.useTable>["setSelection"]
}) {
  const { client } = MR.useMaipl()
  const queryClient = RQ.useQueryClient()

  const onDelete = async () => {
    const message = [
      `Are you sure you want to delete ${props.selection.size} files?`,
      Tree.toString(
        Tree.fromPaths(Array.from(props.selection.values(), file => file.path)),
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
    <M.Stack direction="row" spacing={2}>
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

export default function Files(props: { sx?: M.SxProps }) {
  const {
    debouncedFilter,
    filter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = MR.Files.useTable()

  const [_search, setSearch] = RR.useSearchParams()
  const { folder } = RRT.useLoaderData<ReturnType<typeof loader>>()

  const extraColumns = R.useMemo(
    () =>
      [
        MR.Files.column.accessor(
          file => File.safeMeta(file, "audio", "duration", 0),
          {
            id: "duration",
            header: "Duration",
            cell: info => {
              const value = info.getValue()
              return value ? `${value.toFixed(2)} sec` : "-"
            },
          },
        ),
        MR.Files.column.accessor(
          file => File.safeMeta(file, "audio", "channels", 0),
          {
            id: "channels",
            header: "Channels",
            cell: info => info.getValue(),
          },
        ),
        MR.Files.column.accessor(
          file => File.safeMeta(file, "audio", "sample_rate", 0),
          {
            id: "sample_rate",
            header: "Rate",
            cell: info => {
              const value = info.getValue()
              return value ? `${value} Hz` : "-"
            },
          },
        ),
        MR.Files.column.display({
          id: "actions",
          header: "",
          cell: info => <FileActions file={info.row.original} />,
        }),
      ] as Array<MR.ColumnDef<File.t>>,
    [],
  )

  const { data: files } = MR.Files.useQuery({
    maipl_folder: folder,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1, // bug: when query changes, page needs to be reset
    size: pagination.pageSize,
  })

  return (
    <M.Stack
      spacing={2}
      sx={{
        flexGrow: 1,
        maxHeight: "100%",
        overflow: "hidden",
        padding: 2,
        ...props.sx,
      }}
    >
      <RR.Outlet />
      <M.Stack direction="row" spacing={2}>
        <MR.Picker
          label="Folder"
          setValue={folder => {
            setSearch({ folder }, { replace: true })
            setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
          }}
          value={folder}
          values={[
            File.t_maipl_folder.public,
            File.t_maipl_folder.annotation,
            File.t_maipl_folder.config,
            File.t_maipl_folder.dataset,
            File.t_maipl_folder.model,
            File.t_maipl_folder.raw,
          ]}
        />
        <M.TextField
          size="small"
          label="Path"
          onChange={e => filter.set("path", e.currentTarget.value)}
          placeholder="path/to/folder"
          value={filter.get("path")}
          variant="outlined"
        />
        <M.TextField
          size="small"
          label="Tag"
          onChange={e => filter.set("tag", e.currentTarget.value)}
          placeholder="my-tag"
          value={filter.get("tag")}
          variant="outlined"
        />
        <M.Stack flexGrow={1} />
        <SelectionActions selection={selection} setSelection={setSelection} />
      </M.Stack>
      <MR.Files.Table
        columns={extraColumns}
        rows={files.data}
        count={files.count}
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
          user_id: false,
        }}
      />
    </M.Stack>
  )
}
