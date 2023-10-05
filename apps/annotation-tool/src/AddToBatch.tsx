import { Batch, Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as M from "@mui/material"

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
  const { segments } = props

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

  const onAdd = async () => {
    const segmentIds = segments.map(s => s.id)
    await Promise.all(
      Array.from(selection.values(), batch =>
        Batch.patch(client, {
          id: batch.id,
          segments: union(batch.segments, segmentIds),
        }),
      ),
    )
    setSelection(new Map())
    props.onClose()
  }

  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography variant="h5">
          Selected Segments ({segments.length})
        </M.Typography>
        <MR.Segments.Table
          {...MR.useTable<Segment.t>()}
          rows={segments}
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
            variant="contained"
            color="primary"
            onClick={onAdd}
            children="Submit"
            disabled={selection.size == 0}
          />
          <M.Button
            variant="outlined"
            color="primary"
            onClick={props.onClose}
            children="Cancel"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
