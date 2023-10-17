import { Detection } from "@maipl/api"
import * as F from "@maipl/format"
import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import { useMaipl } from "../context.tsx"
import { useDebounce, useFilter } from "../hooks.ts"

import BaseTable, {
  ColumnDef,
  PaginationState,
  SelectionState,
  usePagination,
  useSelection,
} from "./Table.tsx"

const column = RT.createColumnHelper<Detection.t>()

function useTable(props?: {
  debounceDelay?: number
  filter?: Detection.t_list_request
  pagination?: PaginationState
  selection?: SelectionState<Detection.t>
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)

  const filter = useFilter({
    label: props?.filter?.label ?? "",
    score_max: String(props?.filter?.score_max) ?? "",
    score_min: String(props?.filter?.score_min) ?? "",
  })

  const debouncedFilter = useDebounce(filter, props?.debounceDelay)

  return {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  }
}

function useQuery(props?: Detection.t_list_request) {
  const { client } = useMaipl()
  return RQ.useQuery({
    keepPreviousData: true,
    queryKey: ["detections", "list", props],
    queryFn: () => Detection.list(client, props),
    initialData: [],
  })
}

const Table = BaseTable([
  column.accessor("id", {
    header: "Id",
  }),
  column.accessor("file", {
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
