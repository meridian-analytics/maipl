import { Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import AddToBatch from "./AddToBatch.tsx"

function Actions(props: {
  setModal: R.Dispatch<R.SetStateAction<boolean>>
  selection: ReturnType<typeof MR.Segments.useTable>["selection"]
  setSelection: ReturnType<typeof MR.Segments.useTable>["setSelection"]
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()

  const onAdd = () => {
    props.setModal(true)
  }

  const onDelete = () => {
    const message = `Are you sure you want to delete ${props.selection.size} segments?`
    if (deleteMutation.isIdle && confirm(message)) {
      return deleteMutation.mutateAsync()
    }
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: () =>
      Promise.all(
        Array.from(props.selection.keys(), id =>
          Segment.delete(maipl.client, id),
        ),
      ),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not delete selected segments
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("Segments Actions deleteMutation error", err, vars)
      }
    },
    onSuccess: () => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Deleted {props.selection.size} segments
        </M.Alert>
      ))
      props.setSelection(new Map())
      queryClient.refetchQueries(["segments"])
    },
  })

  return (
    <M.Stack direction="row" spacing={2}>
      <MR.ActionButton
        children={<I.ContentPasteGo />}
        disabled={props.selection.size == 0}
        onClick={onAdd}
        title={
          props.selection.size == 0
            ? "Add to batch …"
            : `Add ${props.selection.size} segments to batch…`
        }
      />
      <MR.ActionButton
        children={<I.DeleteForever />}
        disabled={props.selection.size == 0 || deleteMutation.isLoading}
        onClick={onDelete}
        title={
          props.selection.size == 0
            ? "Delete …"
            : `Delete ${props.selection.size} segments …`
        }
      />
    </M.Stack>
  )
}

export default function SegmentsTable(props: { sx?: M.SxProps }) {
  const { user } = MR.useMaipl()
  const [modal, setModal] = R.useState(false)

  const {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = MR.Segments.useTable()

  const { data: segments } = MR.Segments.useQuery({
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
      <MR.Segments.Table
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
