import { File } from "@maipl/api"
import * as MR from "@maipl/react"
import * as Tree from "@maipl/tree"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import FileEditor from "./FileEditor.js"
import FileUpload from "./FileUpload.js"

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
      <M.Tooltip title="Upload Files">
        <M.IconButton
          children={<I.DriveFolderUpload />}
          component={RR.Link}
          to="/files/upload"
        />
      </M.Tooltip>
      <M.Tooltip title="Create new file">
        <M.IconButton
          children={<I.NoteAdd />}
          component={RR.Link}
          to="/files/new"
        />
      </M.Tooltip>
      <M.Tooltip
        title={
          props.selection.size == 1
            ? "Edit selected file"
            : "Select a single file to edit"
        }
      >
        <M.IconButton
          disabled={props.selection.size != 1}
          children={<I.Edit />}
          onClick={onEdit}
        />
      </M.Tooltip>
      <M.Tooltip
        title={
          props.selection.size == 0
            ? "Delete"
            : `Delete ${props.selection.size} files`
        }
      >
        <M.IconButton
          disabled={props.selection.size == 0}
          children={<I.DeleteForever />}
          onClick={onDelete}
        />
      </M.Tooltip>
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
          sampleRate: false,
          created_at: true,
        }}
      />
    </M.Stack>
  )
}
