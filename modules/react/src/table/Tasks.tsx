import { Task } from "@maipl/api"
import * as F from "@maipl/format"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import { useMaipl } from "../context"
import BaseTable, {
  type ColumnDef,
  type PaginationState,
  type SelectionState,
  usePagination,
  useSelection,
} from "./Table.tsx"

const column = RT.createColumnHelper<Task.t>()

function useTable(props?: {
  pagination?: PaginationState
  selection?: SelectionState<Task.t>
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)
  return {
    pagination,
    selection,
    setPagination,
    setSelection,
  }
}

function useQuery(props?: Task.t_list_request) {
  const { client } = useMaipl()
  return RQ.useQuery({
    queryKey: ["tasks", "list", props],
    queryFn: () => Task.list(client, props),
    initialData: [],
  })
}

const Table = BaseTable([
  column.accessor("id", {
    header: "Id",
  }),
  column.accessor("model_file", {
    header: "Model",
  }),
  column.accessor("description", {
    header: "Description",
  }),
  column.accessor("filelist", {
    header: "Input Files",
    cell: info => info.getValue()?.length ?? 0,
  }),
  column.accessor("created_at", {
    header: "Date",
    cell: info => F.fuzzyTime(info.getValue()),
  }),
  column.accessor("status", {
    header: "Status",
    cell: info => (
      <M.Stack width={100}>
        <TaskStatus status={info.getValue()} />
      </M.Stack>
    ),
  }),
] as Array<ColumnDef<Task.t>>)

function TaskStatus(props: { status: Task.t["status"] }) {
  switch (props.status) {
    case "CREATED":
      return <M.Chip color="default" label="Created" />
    case "FAILURE":
      return <M.Chip color="error" label="Failure" />
    case "PENDING":
      return <M.Chip color="info" label="Pending" />
    case "RETRY":
      return <M.Chip color="warning" label="Retry" />
    case "REVOKED":
      return <M.Chip color="error" label="Revoked" />
    case "STARTED":
      return <M.Chip color="info" label="Started" />
    case "SUCCESS":
      return <M.Chip color="success" label="Success" />
  }
}

export { Table, column, useQuery, useTable }
