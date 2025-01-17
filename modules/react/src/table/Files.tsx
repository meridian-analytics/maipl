import { File, type t_page } from "@maipl/api"
import { filesize, fuzzyTime } from "@maipl/format"
import * as RQ from "@tanstack/react-query"
import * as RT from "@tanstack/react-table"
import * as R from "react"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import { useMaipl } from "../context"
import { useDebounce, useFilter } from "../hooks"
import BaseTable, {
  type ColumnDef,
  type PaginationState,
  type SelectionState,
  usePagination,
  useSelection,
} from "./Table"
import { EditableTagCell } from "./EditableTagCell"

const column = RT.createColumnHelper<File.t>()

function useTable(props?: {
  debounceDelay?: number
  maipl_folder?: File.t_maipl_folder
  pagination?: PaginationState
  path?: File.t_filter_params["path"]
  selection?: SelectionState<File.t>
  shared?: File.t_filter_params["shared"]
  tag?: File.t_filter_params["tag"]
}) {
  const { client } = MR.useMaipl()
  const queryClient = RQ.useQueryClient()

  const updateTagMutation = RQ.useMutation({
    mutationFn: async ({
      fileId,
      newTag,
    }: {
      fileId: number
      newTag: string
    }) => {
      return File.patch(client, fileId, { tag: newTag })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["files", "list"])
    },
    onError: (error) => {
      ;<M.Alert onClose={onClose} severity="error">
        Error: Could not update tag
      </M.Alert>
    },
  })

  const updateTag = R.useCallback(
    (fileId: File.t["id"], newTag: string) => {
      updateTagMutation.mutate({ fileId, newTag })
    },
    [updateTagMutation]
  )

  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)
  const [folder, setFolder] = R.useState<File.t_maipl_folder>(
    props?.maipl_folder ?? File.t_maipl_folder.raw
  )
  const filter = useFilter(
    R.useMemo(
      () => ({
        path: props?.path ?? "",
        shared: props?.shared ?? File.t_filter_shared.all,
        tag: props?.tag ?? "",
      }),
      [props?.path, props?.shared, props?.tag]
    )
  )
  const debouncedFilter = useDebounce(filter, props?.debounceDelay)
  // biome-ignore lint/correctness/useExhaustiveDependencies: go to first page when query changes
  R.useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
  }, [
    pagination.pageSize,
    debouncedFilter.get("path"),
    debouncedFilter.get("shared"),
    debouncedFilter.get("tag"),
  ])
  return {
    folder,
    filter,
    debouncedFilter,
    pagination,
    selection,
    setFolder,
    setPagination,
    setSelection,
    updateTag,
  }
}

function useQuery(props: File.t_list_request) {
  const { client, user } = useMaipl()
  return RQ.useQuery({
    enabled: user != null,
    queryKey: ["files", "list", props],
    queryFn: () => File.list(client, props),
    initialData: (): t_page<File.t> => ({
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
  column.accessor("path", {
    header: "Path",
    size: 300,
  }),
  column.accessor("basename", {
    header: "File Name",
    size: 200,
  }),
  column.accessor("dirname", {
    header: "Path",
    size: 300,
  }),
  column.accessor("extname", {
    header: "Type",
    size: 80,
  }),
  column.accessor("size", {
    header: "Size",
    cell: (info) => filesize(info.getValue()),
  }),
  column.accessor("created_at", {
    header: "Date",
    cell: (info) => fuzzyTime(info.getValue()),
  }),
  column.accessor("tag", {
    header: "Tag",
    cell: ({ getValue, row, table }) => (
      <EditableTagCell
        initialValue={getValue() ?? ""}
        onSave={(newValue) => {
          table.options.meta?.onTagUpdate(row.original.id, newValue)
        }}
      />
    ),
  }),
  column.accessor("user_id", {
    header: "Owner",
  }),
] as Array<ColumnDef<File.t>>)

export { Table, column, useQuery, useTable }
