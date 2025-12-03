import { Detection, type t_page } from "@maipl/api"
import * as F from "@maipl/format"
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

const column = RT.createColumnHelper<Detection.t>()

function useTable(props?: {
  debounceDelay?: number
  filter?: Detection.t_filter_params
  pagination?: PaginationState
  selection?: SelectionState<Detection.t>
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)
  const filter = useFilter(
    R.useMemo(
      () => ({
        label: props?.filter?.label ?? "",
        score_max: String(props?.filter?.score_max) ?? "",
        score_min: String(props?.filter?.score_min) ?? "",
      }),
      [
        props?.filter?.label,
        props?.filter?.score_max,
        props?.filter?.score_min,
      ],
    ),
  )
  const debouncedFilter = useDebounce(filter, props?.debounceDelay)
  // biome-ignore lint/correctness/useExhaustiveDependencies: go to first page when query changes
  R.useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
  }, [
    pagination.pageSize,
    debouncedFilter.get("label"),
    debouncedFilter.get("score_max"),
    debouncedFilter.get("score_min"),
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

function useQuery(filter?: Detection.t_list_request) {
  const { client } = useMaipl()
  return RQ.useQuery({
    queryKey: ["detections", "list", filter],
    queryFn: () => Detection.list(client, filter),
    initialData: (): t_page<Detection.t> => ({
      data: [],
      page: 1,
      size: filter?.size ?? 100,
      count: 0,
      prev: null,
      next: null,
    }),
  })
}

const Table = BaseTable([
  column.accessor("id", {
    header: "Id",
  }),
  column.accessor("filename", {
    header: "File",
  }),
  column.accessor("start", {
    header: "Start",
  }),
  column.accessor("end", {
    header: "End",
  }),
  column.accessor("label", {
    header: "Label",
  }),
  column.accessor("score", {
    header: "Score",
  }),
  column.accessor("created_at", {
    header: "Date",
    cell: info => F.fuzzyTime(info.getValue()),
  }),
] as Array<ColumnDef<Detection.t>>)

export { Table, column, useQuery, useTable }
