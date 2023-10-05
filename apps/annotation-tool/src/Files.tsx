import { File } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"
import GenerateSegments from "./GenerateSegments.jsx"

function Actions(props: {
  setModal: R.Dispatch<R.SetStateAction<boolean>>
  selection: ReturnType<typeof MR.Files.useTable>["selection"]
  setSelection: ReturnType<typeof MR.Files.useTable>["setSelection"]
}) {
  const onGenerate = async () => {
    props.setModal(true)
  }

  return (
    <M.Stack direction="row" spacing={2}>
      <M.Tooltip title="Generate Segments">
        <M.IconButton
          disabled={props.selection.size == 0}
          children={<I.ContentCut />}
          onClick={onGenerate}
        />
      </M.Tooltip>
    </M.Stack>
  )
}

export default function FilesTable(props: { sx?: M.SxProps }) {
  const [modal, setModal] = R.useState(false)

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
      {modal && (
        <GenerateSegments
          onClose={() => setModal(false)}
          files={Array.from(selection.values())}
        />
      )}
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
          label="Path"
          onChange={e => filter.set("path", e.currentTarget.value)}
          placeholder="path/to/folder"
          size="small"
          value={filter.get("path")}
          variant="outlined"
        />
        <M.TextField
          label="Tag"
          onChange={e => filter.set("tag", e.currentTarget.value)}
          placeholder="my-tag"
          size="small"
          value={filter.get("tag")}
          variant="outlined"
        />
        <M.Stack flexGrow={1} />
        <Actions
          setModal={setModal}
          selection={selection}
          setSelection={setSelection}
        />
      </M.Stack>

      <MR.Files.Table
        rows={files.data}
        rowCanSelect={R.useCallback(
          (file: File.t) => ((file.meta?.duration as number) ?? 0) !== 0,
          [],
        )}
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
        }}
      />
    </M.Stack>
  )
}
