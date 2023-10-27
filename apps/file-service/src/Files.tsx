import { File } from "@maipl/api"
import * as MR from "@maipl/react"
import * as Tree from "@maipl/tree"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import FileEditor from "./FileEditor.tsx"
import FileUpload from "./FileUpload.tsx"

function Actions(props: {
  selection: ReturnType<typeof MR.Files.useTable>["selection"]
  setSelection: ReturnType<typeof MR.Files.useTable>["setSelection"]
}) {
  const { client } = MR.useMaipl()
  const queryClient = RQ.useQueryClient()
  const navigate = RR.useNavigate()

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
      queryClient.refetchQueries(["files"])
    }
  }

  const onEdit = async () => {
    for (const file of props.selection.values()) {
      return navigate(`/files/${file.id}/edit`) // return first
    }
  }

  return (
    <M.Stack direction="row" spacing={2}>
      <MR.ActionButton
        children={<I.DriveFolderUpload />}
        component={RR.Link}
        title="Upload Files"
        to="/files/upload"
      />
      <MR.ActionButton
        children={<I.NoteAdd />}
        component={RR.Link}
        title="Create new file"
        to="/files/new"
      />
      <MR.ActionButton
        children={<I.Edit />}
        disabled={props.selection.size != 1}
        onClick={onEdit}
        title={
          props.selection.size == 1
            ? "Edit selected file"
            : "Select a single file to edit"
        }
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

export default function FilesTable(props: { sx?: M.SxProps }) {
  const navigate = RR.useNavigate()

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

  const onClose = async () => {
    navigate("/files")
  }

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
      <RR.Routes>
        <RR.Route
          path="upload"
          element={<FileUpload folder={folder} onClose={onClose} />}
        />
        <RR.Route
          path="new"
          element={<FileEditor folder={folder} onClose={onClose} />}
        />
        <RR.Route
          path=":fileId/edit"
          element={<FileEditor folder={folder} onClose={onClose} />}
        />
      </RR.Routes>
      <M.Stack direction="row" spacing={2}>
        <MR.MaiplFolderPicker
          folder={folder}
          folders={[
            "public",
            "annotation",
            "config",
            "dataset",
            "model",
            "raw",
          ]}
          setFolder={setFolder}
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
        <Actions selection={selection} setSelection={setSelection} />
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
          created_at: true,
        }}
      />
    </M.Stack>
  )
}
