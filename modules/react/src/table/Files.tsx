import { File, t_page } from "@maipl/api"
import { filesize, fuzzyTime } from "@maipl/format"
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

const column = RT.createColumnHelper<File.t>()

function useTable(props?: {
  debounceDelay?: number
  maipl_folder?: File.t_maipl_folder
  pagination?: PaginationState
  path?: string
  selection?: SelectionState<File.t>
  tag?: string
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)

  const [folder, setFolder] = R.useState<File.t_maipl_folder>(
    props?.maipl_folder ?? "public",
  )
  const filter = useFilter({ path: props?.path ?? "", tag: props?.tag ?? "" })
  const debouncedFilter = useDebounce(filter, props?.debounceDelay)

  // hack: fixes bug above in queryParams
  R.useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
  }, [debouncedFilter.get("path"), debouncedFilter.get("tag")])

  return {
    folder,
    filter,
    debouncedFilter,
    pagination,
    selection,
    setFolder,
    setPagination,
    setSelection,
  }
}

function useQuery(props: File.t_list_request) {
  const { client, user } = useMaipl()
  return RQ.useQuery({
    enabled: user != null,
    keepPreviousData: true,
    queryKey: ["files", "list", props],
    queryFn: () => File.list(client, props),
    initialData: () =>
      ({
        data: [],
        page: 1,
        size: props.size,
        count: 0,
        prev: null,
        next: null,
      }) as t_page<File.t>,
  })
}

const Table = BaseTable([
  column.accessor("path", {
    header: "Path",
  }),
  column.accessor("basename", {
    header: "File Name",
  }),
  column.accessor("dirname", {
    header: "Path",
  }),
  column.accessor("extname", {
    header: "Type",
  }),
  column.accessor(row => (row.meta?.duration as number) ?? 0, {
    id: "duration",
    header: "Duration",
    cell: info => {
      const value = info.getValue()
      return value ? `${value.toFixed(2)} sec` : "-"
    },
  }),
  column.accessor("size", {
    header: "Size",
    cell: info => filesize(info.getValue()),
  }),
  column.accessor(row => (row.meta?.channels as number) ?? 0, {
    id: "channels",
    header: "Channels",
    cell: info => info.getValue(),
  }),
  column.accessor(row => (row.meta?.sampleRate as number) ?? 0, {
    id: "sampleRate",
    header: "Rate",
    cell: info => {
      const value = info.getValue()
      return value ? `${value} Hz` : "-"
    },
  }),
  column.accessor("created_at", {
    header: "Date",
    cell: info => fuzzyTime(info.getValue()),
  }),
  column.accessor("tag", {
    header: "Tag",
  }),
] as Array<ColumnDef<File.t>>)

export { Table, column, useQuery, useTable }
