import * as M from "@mui/material"
import * as RT from "@tanstack/react-table"
import * as R from "react"

export type SelectionState<T, TID = number> = Map<TID, T>
export {
  type ColumnDef,
  type PaginationState,
  type VisibilityState,
} from "@tanstack/react-table"

export function usePagination(props?: RT.PaginationState) {
  const [pagination, setPagination] = R.useState<RT.PaginationState>(() => ({
    pageIndex: props?.pageIndex ?? 0,
    pageSize: props?.pageSize ?? 100,
  }))
  return [pagination, setPagination] as const
}

export function useSelection<T, TID = number>(props?: SelectionState<T, TID>) {
  const [selection, setSelection] = R.useState<SelectionState<T, TID>>(
    () => props ?? new Map()
  )
  return [selection, setSelection] as const
}

export function useTable<T, TID = number>(props?: {
  pagination?: RT.PaginationState
  selection?: SelectionState<T, TID>
}) {
  const [pagination, setPagination] = usePagination(props?.pagination)
  const [selection, setSelection] = useSelection(props?.selection)
  return {
    pagination,
    selection,
    setPagination,
    setSelection,
  }
}

export default function BaseTable<T extends { id: TID }, TID = number>(
  columns?: Array<RT.ColumnDef<T>>
): R.FC<{
  columns?: Array<RT.ColumnDef<T>>
  count?: number
  pagination: RT.PaginationState
  rowCanSelect?: (data: T) => boolean
  rows: Array<T>
  rowsPerPageOptions?: Array<number>
  selection: SelectionState<T, TID>
  setPagination: R.Dispatch<R.SetStateAction<RT.PaginationState>>
  setSelection: R.Dispatch<R.SetStateAction<SelectionState<T, TID>>>
  sx?: M.SxProps
  visibility?: RT.VisibilityState
  initialColumnSizing?: RT.ColumnSizingState
  meta?: {
    onTagUpdate: (fileId: TID, newTag: string) => void
  }
}> {
  return (props) => {
    const columnHelper = RT.createColumnHelper<T>()
    const memoColumns = R.useMemo(
      () => [
        columnHelper.display({
          id: "select",
          size: 35,
          enableResizing: false,
          header: ({ table }) => {
            const rows = table.getPaginationRowModel().rows
            const count = rows.filter((row) =>
              props.selection.has(row.original.id)
            ).length
            const checked = count == rows.length
            const indeterminate = count > 0 && count < rows.length
            return (
              <M.Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <M.Checkbox
                  checked={checked}
                  indeterminate={indeterminate}
                  size="small"
                  onChange={() =>
                    props.setSelection((prev) => {
                      if (indeterminate) return new Map()
                      const next = new Map(prev)
                      for (const row of table.getPaginationRowModel().rows) {
                        if (next.has(row.original.id))
                          next.delete(row.original.id)
                        else if (props.rowCanSelect?.(row.original) ?? true)
                          next.set(row.original.id, row.original)
                      }
                      return next
                    })
                  }
                />
              </M.Box>
            )
          },
          cell: ({ row }) => (
            <M.Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <M.Checkbox
                size="small"
                disabled={(props.rowCanSelect?.(row.original) ?? true) != true}
                checked={props.selection.has(row.original.id)}
                indeterminate={false}
                onChange={() =>
                  props.setSelection((prev) => {
                    const next = new Map(prev)
                    if (next.has(row.original.id)) next.delete(row.original.id)
                    else next.set(row.original.id, row.original)
                    return next
                  })
                }
              />
            </M.Box>
          ),
        }),
        ...(columns ?? []),
        ...(props.columns ?? []),
      ],
      [
        columnHelper,
        columns,
        props.columns,
        props.rowCanSelect,
        props.selection,
        props.setSelection,
      ]
    )

    // hack: react-table should be paginating preloaded arrays
    const memoData = R.useMemo(
      () =>
        props.rows.length > props.pagination.pageSize
          ? props.rows.slice(
              props.pagination.pageIndex * props.pagination.pageSize,
              (props.pagination.pageIndex + 1) * props.pagination.pageSize
            )
          : props.rows,
      [props.rows, props.pagination.pageIndex, props.pagination.pageSize]
    )

    const [columnSizing, setColumnSizing] = R.useState<RT.ColumnSizingState>(
      () => props.initialColumnSizing ?? {}
    )

    const table = RT.useReactTable<T>({
      data: memoData,
      columns: memoColumns,
      state: {
        columnVisibility: props.visibility,
        columnSizing,
      },
      onColumnSizingChange: (updater) => {
        setColumnSizing((old) => {
          const newSizing = (
            typeof updater === "function" ? updater(old) : updater
          ) as RT.ColumnSizingState
          // Enforce min/max sizes
          Object.entries(newSizing).forEach(([columnId, size]) => {
            const column = table.getColumn(columnId)
            if (column) {
              const minSize = column.columnDef.minSize ?? 50
              const maxSize = column.columnDef.maxSize ?? 500
              newSizing[columnId] = Math.min(Math.max(size, minSize), maxSize)
            }
          })
          return newSizing
        })
      },
      columnResizeMode: "onChange",
      getCoreRowModel: RT.getCoreRowModel(),
      getFilteredRowModel: RT.getFilteredRowModel(),
      getRowId: (row) => String(row.id),
      meta: props.meta,
      defaultColumn: {
        minSize: 50,
        maxSize: 500,
        size: 100,
        enableResizing: true,
      },
    })

    return (
      <M.Stack
        component={M.Paper}
        sx={{
          flexGrow: 1,
          maxHeight: "100%",
          overflow: "hidden",
          ...props.sx,
        }}
      >
        <M.TableContainer
          sx={{
            flexGrow: 1,
            position: "relative",
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          <M.Table
            stickyHeader
            sx={{
              maxHeight: "100%",
              overflow: "hidden",
              position: "relative",
              borderCollapse: "separate",
              borderSpacing: 0,
              tableLayout: "fixed",
              width: "100%",
              minWidth: "auto",
              "& .resizer": {
                position: "absolute",
                right: -3,
                top: 0,
                height: "100%",
                width: "6px",
                background: "transparent",
                cursor: "col-resize",
                userSelect: "none",
                touchAction: "none",
                zIndex: 1,
                transition: "background-color 150ms ease",
                "&:hover": {
                  background: "rgba(0, 0, 0, 0.1)",
                },
                "&.isResizing": {
                  background: "rgba(0, 0, 0, 0.2)",
                  opacity: 1,
                },
              },
              "& th": {
                position: "relative",
                transition: "width 150ms ease",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  right: -1,
                  top: 0,
                  height: "100%",
                  width: "1px",
                  background: "rgba(224, 224, 224, 1)",
                },
              },
              "& td": {
                transition: "width 150ms ease",
              },
            }}
          >
            <M.TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <M.TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <M.TableCell
                      key={header.id}
                      colSpan={header.colSpan}
                      sx={{
                        width: header.getSize(),
                        position: "relative",
                        padding: "16px 8px",
                        whiteSpace: "nowrap",
                        ...(header.column.id === "select" && {
                          padding: "8px 0",
                          "& .MuiBox-root": {
                            justifyContent: "center",
                          },
                        }),
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <M.Box
                          sx={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {RT.flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanResize() && (
                            <M.Box
                              className={`resizer ${
                                header.column.getIsResizing()
                                  ? "isResizing"
                                  : ""
                              }`}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            />
                          )}
                        </M.Box>
                      )}
                    </M.TableCell>
                  ))}
                </M.TableRow>
              ))}
            </M.TableHead>
            <M.TableBody>
              {table.getRowModel().rows.map((row) => (
                <M.TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <M.TableCell
                      key={cell.id}
                      align="left"
                      sx={{
                        width: cell.column.getSize(),
                        position: "relative",
                        padding: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <M.Box
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {RT.flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </M.Box>
                    </M.TableCell>
                  ))}
                </M.TableRow>
              ))}
            </M.TableBody>
          </M.Table>
        </M.TableContainer>
        <M.TablePagination
          component={M.Box}
          count={props.count ?? props.rows.length}
          flexShrink={0}
          rowsPerPage={props.pagination.pageSize}
          rowsPerPageOptions={props.rowsPerPageOptions ?? [10, 25, 100]}
          page={
            (props.count ?? props.rows.length) > props.pagination.pageSize
              ? props.pagination.pageIndex
              : 0
          }
          onPageChange={(_e, newPage) => {
            props.setPagination({
              pageIndex: newPage,
              pageSize: props.pagination.pageSize,
            })
          }}
          onRowsPerPageChange={(e) => {
            props.setPagination({
              pageIndex: 0,
              pageSize: Number(e.target.value),
            })
          }}
        />
      </M.Stack>
    )
  }
}
