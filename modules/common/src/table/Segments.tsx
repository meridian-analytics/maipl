import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import * as R from "react"
import { Segment } from "../api.ts"
import { iso8601 } from "../format.ts"
import { useDebounce, useFilter, useMaipl } from "../hooks.ts"
import { t_page } from "../types.ts"
import BaseTable, {
  ColumnDef,
  PaginationState,
  SelectionState,
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
  const filter = useFilter({
    filename: props?.filename ?? "",
    tag: props?.tag ?? "",
  })
  const debouncedFilter = useDebounce(filter, props?.debounceDelay ?? 500)
  R.useEffect(() => {
    // hack: fixes bug above in queryParams
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
  }, [debouncedFilter.get("filename"), debouncedFilter.get("tag")])
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
    keepPreviousData: true,
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
  column.accessor("tag", {
    header: "Tag",
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
  column.accessor("created_at", {
    header: "Date",
    cell: info => {
      const value = info.getValue()
      return value == null ? "-" : iso8601(value)
    },
  }),
] as Array<ColumnDef<Segment.t>>)

export { Table, column, useTable, useQuery }
