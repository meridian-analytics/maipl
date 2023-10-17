import { Batch, t_page } from "@maipl/api"
import { iso8601 } from "@maipl/format"
import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import * as R from "react"
import { useMaipl } from "../context.tsx"
import { useDebounce, useFilter } from "../hooks.ts"
import BaseTable, {
  ColumnDef,
  PaginationState,
  SelectionState,
  usePagination,
  useSelection,
} from "./Table.tsx"

const column = RT.createColumnHelper<Batch.t_list_item>()

function useTable(props?: {
  debounceDelay?: number
  pagination?: PaginationState
  name?: string
  selection?: SelectionState<Batch.t_list_item>
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)

  const filter = useFilter({ name: props?.name ?? "" })
  const debouncedFilter = useDebounce(filter, props?.debounceDelay ?? 500)

  // hack: fixes bug above in queryParams
  R.useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
  }, [debouncedFilter.get("name")])

  return {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  }
}

function useQuery(props: Batch.t_list_request) {
  const { client, user } = useMaipl()
  return RQ.useQuery({
    enabled: user != null,
    keepPreviousData: true,
    queryKey: ["batches", "list", props],
    queryFn: () => Batch.list(client, props),
    initialData: () =>
      ({
        data: [],
        page: 1,
        size: props.size,
        count: 0,
        prev: null,
        next: null,
      }) as t_page<Batch.t_list_item>,
  })
}

const Table = BaseTable([
  column.accessor("batch_name", {
    header: "Name",
  }),
  column.accessor("description", {
    header: "Description",
  }),
  column.accessor("segments", {
    header: "Segments",
    cell: info => info.getValue()?.length ?? 0,
  }),
  column.accessor("user", {
    header: "Owner",
  }),
  column.accessor("progress", {
    header: "Progress",
  }),
  column.accessor("created_at", {
    header: "Date",
    cell: info => {
      const value = info.getValue()
      return value == null ? "-" : iso8601(value)
    },
  }),
] as Array<ColumnDef<Batch.t_list_item>>)

export { Table, column, useQuery, useTable }
