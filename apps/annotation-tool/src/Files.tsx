import { File } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"
import GenerateSegments from "./GenerateSegments.tsx"

function Actions(props: {
  setModal: R.Dispatch<R.SetStateAction<boolean>>
  selection: ReturnType<typeof MR.Files.useTable>["selection"]
  setSelection: ReturnType<typeof MR.Files.useTable>["setSelection"]
}) {
  const onGenerate = async () => {
    props.setModal(true)
  }

  return (
    <M.Stack direction="row">
      <MR.ActionButton
        children={<I.ContentCut />}
        disabled={props.selection.size == 0}
        onClick={onGenerate}
        title="Generate Segments"
      />
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
      <M.Stack direction="row">
        <MR.Picker
          label="Folder"
          setValue={setFolder}
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
          label="Path"
          onChange={e => filter.set("path", e.currentTarget.value)}
          placeholder="path/to/folder"
          value={filter.get("path")}
        />
        <M.TextField
          label="Tag"
          onChange={e => filter.set("tag", e.currentTarget.value)}
          placeholder="my-tag"
          value={filter.get("tag")}
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
          (file: File.t) => File.safeMeta(file, "audio", "duration", 0) != 0,
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
          sample_rate: false,
        }}
      />
    </M.Stack>
  )
}
