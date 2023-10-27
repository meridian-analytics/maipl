import { Batch, Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"

function union<T>(a: Array<T>, b: Array<T>): Array<T> {
  const r = new Set(a)
  for (const v of b) r.add(v)
  return Array.from(r)
}

export default function AddToBatch(props: {
  onClose: () => void
  segments: Array<Segment.t>
}) {
  const { client, user } = MR.useMaipl()
  const notify = MR.useNotify()

  const {
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = MR.Batches.useTable()

  const { data: batches } = MR.Batches.useQuery({
    // filters
    name: debouncedFilter.get("name"),
    user: user?.id,
    // pagination
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

  const onAdd = () => {
    if (addMutation.isIdle) {
      return addMutation.mutateAsync()
    }
  }

  const addMutation = RQ.useMutation({
    mutationFn: () => {
      const segmentIds = props.segments.map(s => s.id)
      return Promise.all(
        Array.from(selection.values(), batch =>
          Batch.patch(client, {
            id: batch.id,
            segments: union(batch.segments, segmentIds),
          }),
        ),
      )
    },
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: could not add segments to selected batches.
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("AddToBatch addMutation error", err, vars)
      }
    },
    onSuccess: () => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Added {props.segments.length} segments to {selection.size}{" "}
          batches.
        </M.Alert>
      ))
      setSelection(new Map())
      props.onClose()
    },
  })

  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography variant="h5">
          Selected Segments ({props.segments.length})
        </M.Typography>
        <MR.Segments.Table
          {...MR.useTable<Segment.t>()}
          rows={props.segments}
          sx={{ maxHeight: "35vh" }}
          visibility={{
            select: false,
          }}
        />
        <M.Typography variant="h5">
          Selected Batches ({selection.size})
        </M.Typography>
        <MR.Batches.Table
          rows={batches.data}
          count={batches.count}
          pagination={pagination}
          selection={selection}
          setPagination={setPagination}
          setSelection={setSelection}
          sx={{ maxHeight: "35vh" }}
          visibility={{
            actions: false,
          }}
        />
        <M.Stack direction="row-reverse" spacing={2}>
          <M.Button
            children="Submit"
            color="primary"
            disabled={selection.size == 0 || addMutation.isLoading}
            onClick={onAdd}
            variant="contained"
          />
          <M.Button
            children="Cancel"
            color="primary"
            onClick={props.onClose}
            variant="outlined"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
