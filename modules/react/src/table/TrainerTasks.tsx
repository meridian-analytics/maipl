import { TrainerTask, type t_page } from "@maipl/api"
import * as F from "@maipl/format"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import * as R from "react"
import { useMaipl } from "../context"
import { useDebounce, useFilter } from "../hooks"
import BaseTable, {
  type ColumnDef,
  type PaginationState,
  type SelectionState,
  usePagination,
  useSelection,
} from "./Table"

const column = RT.createColumnHelper<TrainerTask.t_list_item>()

function useTable(props?: {
  debounceDelay?: number
  name?: string
  pagination?: PaginationState
  selection?: SelectionState<TrainerTask.t_list_item>
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)
  const filter = useFilter(
    R.useMemo(() => ({ name: props?.name ?? "" }), [props?.name])
  )
  const debouncedFilter = useDebounce(filter, props?.debounceDelay)
  R.useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
  }, [pagination.pageSize, debouncedFilter.get("name")])
  return {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  }
}

function useQuery(props?: TrainerTask.t_list_request) {
  const { client } = useMaipl()
  return RQ.useQuery({
    queryKey: ["trainer_tasks", "list", props],
    queryFn: () => TrainerTask.list(client, props),
    initialData: (): t_page<TrainerTask.t_list_item> => ({
      data: [],
      page: 1,
      size: props.size ?? 100,
      count: 0,
      prev: null,
      next: null,
    }),
  })
}

const Table = BaseTable([
  column.accessor("name", {
    header: "Name",
  }),
  column.accessor("description", {
    header: "Description",
  }),
  column.accessor("created_at", {
    header: "Date",
    cell: (info) => F.fuzzyTime(info.getValue()),
  }),
  column.accessor("status", {
    header: "Status",
    cell: (info) => (
      <M.Stack width={100}>
        <TaskStatus status={info.getValue()} />
      </M.Stack>
    ),
  }),
] as Array<ColumnDef<TrainerTask.t_list_item>>)

function TaskStatus(props: { status: TrainerTask.t_list_item["status"] }) {
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
