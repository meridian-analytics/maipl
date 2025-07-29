import * as F from "@maipl/format"
import * as M from "@mui/material"
import * as RT from "@tanstack/react-table"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import type { DatabaseTask } from "../types"
import { mockApi } from "../api/mockApi"
import {
  type ColumnDef,
  type PaginationState,
  type SelectionState,
  usePagination,
  useSelection,
  Table as BaseTable,
} from "@maipl/react"

const column = RT.createColumnHelper<DatabaseTask>()

function useTable(props?: {
  pagination?: PaginationState
  selection?: SelectionState<DatabaseTask>
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)
  // biome-ignore lint/correctness/useExhaustiveDependencies: go to first page when query changes
  R.useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
  }, [pagination.pageSize])
  return {
    pagination,
    selection,
    setPagination,
    setSelection,
  }
}

function useQuery() {
  return RQ.useQuery({
    queryKey: ['database-tasks'],
    queryFn: () => mockApi.getTasks(),
    initialData: []
  })
}

const Table = BaseTable([
  column.accessor("id", { header: "Task ID", size: 120 }),
  column.accessor("task_name", { header: "Task Name", size: 200 }),
  column.accessor("description", { header: "Description", size: 250 }),
  column.accessor("database_file.filename", { header: "Database File", size: 180 }),
  column.accessor("groups", { header: "Groups", size: 100, cell: info => info.getValue().length }),
  column.accessor("created_at", { header: "Created", size: 120, cell: info => F.fuzzyTime(new Date(info.getValue())) }),
  column.accessor("status", { header: "Status", size: 120, cell: info => (
    <M.Stack width={100}> <TaskStatus status={info.getValue()} /> </M.Stack>
  )}),
] as Array<ColumnDef<DatabaseTask>>)

function TaskStatus(props: { status: DatabaseTask["status"] }) {
  switch (props.status) {
    case "active":
      return <M.Chip color="primary" label="Active" size="small" />
    case "completed":
      return <M.Chip color="success" label="Completed" size="small" />
    case "failed":
      return <M.Chip color="error" label="Failed" size="small" />
    case "in_progress":
      return <M.Chip color="warning" label="In Progress" size="small" />
    default:
      return <M.Chip color="default" label={props.status} size="small" />
  }
}

export { Table, column, useQuery, useTable } 