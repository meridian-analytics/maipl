import { Segment, type t_page } from "@maipl/api"
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
} from "./Table.tsx"

const column = RT.createColumnHelper<Segment.t>()

function useTable(props?: {
  debounceDelay?: number
  pagination?: PaginationState
  filename?: string
  selection?: SelectionState<Segment.t>
  tag?: string
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)
  const filter = useFilter(
    R.useMemo(
      () => ({
        filename: props?.filename ?? "",
        tag: props?.tag ?? "",
      }),
      [props?.filename, props?.tag],
    ),
  )
  const debouncedFilter = useDebounce(filter, props?.debounceDelay)
  // biome-ignore lint/correctness/useExhaustiveDependencies: go to first page when query changes
  R.useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
  }, [
    pagination.pageSize,
    debouncedFilter.get("filename"),
    debouncedFilter.get("tag"),
  ])
  return {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  }
}

function useQuery(props: Segment.t_list_request) {
  const { client } = useMaipl()
  return RQ.useQuery({
    queryKey: ["segments", "list", props],
    queryFn: () => Segment.list(client, props),
    initialData: () =>
      ({
        data: [],
        page: 1,
        size: props.size,
        count: 0,
        prev: null,
        next: null,
      }) as t_page<Segment.t>,
  })
}

const Table = BaseTable([
  column.accessor("filename", {
    header: "File Name",
  }),
  column.accessor("start", {
    header: "Start",
    cell: info => `${info.getValue().toFixed(2)} sec`,
  }),
  column.accessor("end", {
    header: "End",
    cell: info => `${info.getValue().toFixed(2)} sec`,
  }),
  column.accessor(row => row.end - row.start, {
    id: "duration",
    header: "Duration",
    cell: info => `${info.getValue().toFixed(2)} sec`,
  }),
] as Array<ColumnDef<Segment.t>>)

export { Table, column, useTable, useQuery }
