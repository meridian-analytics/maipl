import { Batch } from "@maipl/common/api"
import { useMaipl } from "@maipl/common/context"
import { Batches } from "@maipl/common/table"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import EditBatch from "./EditBatch.js"

function BatchActions(props: { batch: Batch.t_list_item }) {
  const queryClient = RQ.useQueryClient()
  const [anchorEl, setAnchorEl] = R.useState<HTMLElement | null>(null)
  const buttonId = R.useId()
  const menuId = R.useId()
  const { client } = useMaipl()
  const { batch } = props
  const open = anchorEl != null

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const onClose = () => {
    setAnchorEl(null)
  }

  const onDelete = async () => {
    const message = `Are you sure you want to delete batch: ${batch.batch_name}?`
    if (confirm(message)) {
      await Batch.delete(client, batch.id)
      queryClient.refetchQueries(["batches"])
    }
  }

  const onExport = async () => {
    try {
      const res = await Batch.export(client, batch.id)
      queryClient.refetchQueries(["files"])
      console.warn("onExport", res)
    } catch (err) {
      console.error("onExport", err)
    }
  }

  const onProcess = async () => {
    try {
      const res = await Batch.process(client, batch.id)
      console.warn("todo: onProcess", res)
    } catch (err) {
      console.error("todo: onProcess", err)
    }
  }

  const onShare = () => {
    console.warn("todo: onShare", batch)
  }

  return (
    <>
      <M.IconButton
        aria-controls={open ? menuId : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="true"
        children={<I.ContentPasteSearch />}
        id={buttonId}
        onClick={onClick}
      />
      <M.Menu
        anchorEl={anchorEl}
        id={menuId}
        open={open}
        onClose={onClose}
        MenuListProps={{
          "aria-labelledby": buttonId,
        }}
      >
        <M.MenuItem onClick={onProcess} children="Submit for processing..." />
        <M.Divider />
        <M.MenuItem
          children="Detail"
          component={RR.Link}
          to={`/batches/${batch.id}`}
        />
        <M.MenuItem onClick={onShare} children="Share" />
        <M.Divider />
        <M.MenuItem
          children="Create Annotations"
          component={RR.Link}
          to={`/annotate/${batch.id}`}
        />
        <M.MenuItem onClick={onExport} children="Export Annotations" />
        <M.Divider />
        <M.MenuItem onClick={onDelete} children="Delete" />
      </M.Menu>
    </>
  )
}

export default function BatchesTable(props: { sx?: M.SxProps }) {
  const { user } = useMaipl()
  const navigate = RR.useNavigate()

  const {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = Batches.useTable()

  const { data: batches } = Batches.useQuery({
    // filters
    name: debouncedFilter.get("name"),
    user: user?.id,
    // pagination
    page: pagination.pageIndex + 1, // bug: when query changes, page needs to be reset
    size: pagination.pageSize,
  })

  const columns = R.useMemo(
    () => [
      Batches.column.display({
        id: "actions",
        header: "",
        cell: info => <BatchActions batch={info.row.original} />,
      }),
    ],
    [],
  )

  const onClose = () => {
    navigate("/batches")
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
          path="new"
          element={<EditBatch isNew={true} onClose={onClose} />}
        />
        <RR.Route
          path=":batchId"
          element={<EditBatch isNew={false} onClose={onClose} />}
        />
      </RR.Routes>
      <M.Stack direction="row" spacing={2}>
        <M.TextField
          label="Name"
          onChange={e => filter.set("name", e.currentTarget.value)}
          placeholder="Batch name..."
          size="small"
          value={filter.get("name")}
          variant="outlined"
        />
        <M.Stack flexGrow={1} />
        <M.Tooltip title="Create Batch">
          <M.IconButton
            children={<I.AddCircle />}
            component={RR.Link}
            to="/batches/new"
          />
        </M.Tooltip>
      </M.Stack>
      <Batches.Table
        rows={batches.data}
        columns={columns}
        count={batches.count}
        pagination={pagination}
        selection={selection}
        setPagination={setPagination}
        setSelection={setSelection}
        visibility={{
          select: false,
        }}
      />
    </M.Stack>
  )
}
