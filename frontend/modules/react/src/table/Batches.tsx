import { Batch, type t_page } from "@maipl/api"
import { iso8601 } from "@maipl/format"
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

const column = RT.createColumnHelper<Batch.t_list_item>()

function useTable(props?: {
  debounceDelay?: number
  pagination?: PaginationState
  name?: string
  selection?: SelectionState<Batch.t_list_item>
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)
  const filter = useFilter(
    R.useMemo(() => ({ name: props?.name ?? "" }), [props?.name])
  )
  const debouncedFilter = useDebounce(filter, props?.debounceDelay)
  // biome-ignore lint/correctness/useExhaustiveDependencies: go to first page when query changes
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

function useQuery(props: Batch.t_list_request & { polling?: boolean }) {
  const { client, user } = useMaipl()
  const { polling = true, ...queryProps } = props
  return RQ.useQuery({
    enabled: user != null,
    queryKey: ["batches", "list", queryProps],
    queryFn: () => Batch.list(client, queryProps),
    initialData: (): t_page<Batch.t_list_item> => ({
      data: [],
      page: 1,
      size: queryProps.size ?? 100,
      count: 0,
      prev: null,
      next: null,
    }),
    refetchInterval: polling ? 5000 : false,
    refetchIntervalInBackground: false,
  })
}

const Table = BaseTable([
  column.accessor("batch_name", {
    header: "Name",
    size: 100,
  }),
  column.accessor("description", {
    header: "Description",
    size: 300,
  }),
  column.accessor("segments", {
    header: "Segments",
    cell: (info) => info.getValue()?.length ?? 0,
    size: 100,
  }),
  column.accessor("user_id", {
    header: "Owner",
    size: 100,
  }),
  column.accessor("progress", {
    header: "Progress",
    size: 100,
  }),
  column.accessor("created_at", {
    header: "Date",
    cell: (info) => {
      const value = info.getValue()
      return value == null ? "-" : iso8601(value)
    },
    size: 150,
  }),
] as Array<ColumnDef<Batch.t_list_item>>)

export { Table, column, useQuery, useTable }
