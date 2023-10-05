import { Segment } from "@maipl/common/api"
import { useMaipl } from "@maipl/common/hooks"
import { Segments } from "@maipl/common/table"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import AddToBatch from "./AddToBatch.jsx"

function Actions(props: {
  setModal: R.Dispatch<R.SetStateAction<boolean>>
  selection: ReturnType<typeof Segments.useTable>["selection"]
  setSelection: ReturnType<typeof Segments.useTable>["setSelection"]
}) {
  const { client, user } = useMaipl()
  const queryClient = RQ.useQueryClient()

  const onAdd = async () => {
    props.setModal(true)
  }

  const onDelete = async () => {
    const message = `Are you sure you want to delete ${props.selection.size} segments?`
    if (confirm(message)) {
      await Promise.all(
        Array.from(props.selection.keys(), id => Segment.delete(client, id)),
      )
      props.setSelection(new Map())
      // bug: how to handle when deleting all items on last page?
      // setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
      queryClient.refetchQueries(["segments"])
    }
  }

  return (
    <M.Stack direction="row" spacing={2}>
      <M.Tooltip
        title={
          props.selection.size == 0
            ? "Add to batch …"
            : `Add ${props.selection.size} segments to batch…`
        }
      >
        <M.IconButton
          disabled={props.selection.size == 0}
          children={<I.ContentPasteGo />}
          onClick={onAdd}
        />
      </M.Tooltip>
      <M.Tooltip
        title={
          props.selection.size == 0
            ? "Delete …"
            : `Delete ${props.selection.size} segments …`
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

export default function SegmentsTable(props: { sx?: M.SxProps }) {
  const { user } = useMaipl()
  const [modal, setModal] = R.useState(false)

  const {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = Segments.useTable()

  const { data: segments } = Segments.useQuery({
    // filters
    filename: debouncedFilter.get("filename"),
    tag: debouncedFilter.get("tag"),
    user: user?.id,
    // pagination
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
        <AddToBatch
          segments={Array.from(selection.values())}
          onClose={() => {
            setModal(false)
          }}
        />
      )}
      <M.Stack direction="row" spacing={2}>
        <M.TextField
          label="Filename"
          onChange={e => filter.set("filename", e.currentTarget.value)}
          placeholder="path/to/myfile.ext"
          size="small"
          value={filter.get("filename")}
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
      <Segments.Table
        rows={segments.data}
        count={segments.count}
        pagination={pagination}
        selection={selection}
        setPagination={setPagination}
        setSelection={setSelection}
      />
    </M.Stack>
  )
}
