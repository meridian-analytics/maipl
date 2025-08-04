import * as F from "@maipl/format"
import * as M from "@mui/material"
import * as RT from "@tanstack/react-table"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import type { DatabaseTask } from "../types"
import { createDatabaseTaskApi } from "../api/client"
import {
  type ColumnDef,
  type PaginationState,
  type SelectionState,
  usePagination,
  useSelection,
  Table as BaseTable,
  useMaipl,
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
  const maipl = useMaipl()
  const databaseTaskApi = createDatabaseTaskApi(maipl.client)
  
  return RQ.useQuery({
    queryKey: ['database-tasks'],
    queryFn: () => databaseTaskApi.getTasks(),
    initialData: { data: [], count: 0, next: null, previous: null }
  })
}

const Table = BaseTable([
  column.accessor("id", { header: "Task ID", size: 120 }),
  column.accessor("task_name", { header: "Task Name", size: 200 }),
  column.accessor("description", { header: "Description", size: 250 }),
  column.display({
    id: "database_file",
    header: "Database File",
    size: 180,
    cell: info => info.row.original.database_file?.filename || 'No database file'
  }),
  column.display({
    id: "groups",
    header: "Groups",
    size: 100,
    cell: info => {
      const groups = info.row.original.groups
      const metadataGroups = info.row.original.database_metadata?.groups
      // Use groups array if available, otherwise fall back to metadata groups
      return groups?.length || metadataGroups?.length || 0
    }
  }),
  column.display({
    id: "total_samples",
    header: "Total Samples",
    size: 120,
    cell: info => info.row.original.database_metadata?.total_samples || 0
  }),
  column.accessor("created_at", { header: "Created", size: 120, cell: info => F.fuzzyTime(info.getValue()) }),
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