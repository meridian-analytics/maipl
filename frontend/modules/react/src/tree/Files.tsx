import { File } from "@maipl/api"
import { filesize, fuzzyTime } from "@maipl/format"
import * as M from "@mui/material"
import * as I from "@mui/icons-material"
import * as R from "react"
import * as RQ from "@tanstack/react-query"
import { useMaipl } from "../context"
import type { PaginationState, SelectionState } from "../table/Table"
import { EditableTagCell } from "../table/EditableTagCell"
import UserAvatarGroup from "../ui/UserAvatarGroup"

/** Folder tree node state */
type FolderNodeState = {
  expanded: boolean
  loaded: boolean
}

/** Folder tree component props */
type FolderTreeProps = {
  maipl_folder: File.t_maipl_folder
  path_prefix?: string
  tag?: string
  shared?: File.t_filter_shared
  onPathChange?: (path: string) => void
  currentPath?: string
}

/** Folder list view component props */
type FolderListViewProps = {
  maipl_folder: File.t_maipl_folder
  path_prefix?: string
  tag?: string
  shared?: File.t_filter_shared
  pagination: PaginationState
  onPaginationChange: (pagination: PaginationState) => void
  onFolderClick?: (path: string) => void
  onFileClick?: (file: File.t) => void
  selection?: SelectionState<File.t>
  setSelection?: R.Dispatch<R.SetStateAction<SelectionState<File.t>>>
  onTagUpdate?: (fileId: number, newTag: string) => void
  FileActionsComponent?: R.ComponentType<{ file: File.t }>
}

/** Hook to fetch folder contents */
function useFolderQuery(props: File.t_folder_list_request) {
  const { client, user } = useMaipl()
  return RQ.useQuery({
    enabled: user != null,
    queryKey: ["files", "folder", props],
    queryFn: () => File.listFolder(client, props),
    staleTime: 30000, // Cache for 30 seconds
  })
}

/** Folder tree node component */
function FolderTreeNode(props: {
  folder: File.t_folder
  level: number
  expanded: boolean
  onToggle: () => void
  onSelect: () => void
  isSelected: boolean
}) {
  return (
    <M.Box>
      <M.Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          pl: props.level * 2,
          py: 0.5,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
          bgcolor: props.isSelected ? "action.selected" : "transparent",
        }}
        onClick={props.onSelect}
      >
        <M.IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            props.onToggle()
          }}
        >
          {props.expanded ? <I.ExpandLess /> : <I.ExpandMore />}
        </M.IconButton>
        <I.Folder sx={{ color: "primary.main" }} />
        <M.Typography variant="body2" sx={{ flexGrow: 1 }}>
          {props.folder.name}
        </M.Typography>
        <M.Chip
          label={props.folder.file_count}
          size="small"
          variant="outlined"
        />
      </M.Stack>
    </M.Box>
  )
}

/** Folder tree component */
export function FolderTree(props: FolderTreeProps) {
  const [nodeStates, setNodeStates] = R.useState<
    Map<string, FolderNodeState>
  >(new Map())

  const { data: rootData } = useFolderQuery({
    path_prefix: props.path_prefix ?? "",
    maipl_folder: props.maipl_folder,
    tag: props.tag,
    shared: props.shared,
    page: 1,
    size: 100, // Get more folders initially
  })

  const toggleNode = R.useCallback((path: string) => {
    setNodeStates((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(path) ?? { expanded: false, loaded: false }
      newMap.set(path, {
        ...current,
        expanded: !current.expanded,
        loaded: true,
      })
      return newMap
    })
  }, [])

  const handleFolderClick = R.useCallback(
    (path: string) => {
      props.onPathChange?.(path)
    },
    [props]
  )

  if (!rootData) {
    return <M.CircularProgress />
  }

  return (
    <M.Box>
      {rootData.folders.map((folder) => {
        const nodeState = nodeStates.get(folder.path) ?? {
          expanded: false,
          loaded: false,
        }
        const isSelected = props.currentPath === folder.path

        return (
          <R.Fragment key={folder.path}>
            <FolderTreeNode
              folder={folder}
              level={0}
              expanded={nodeState.expanded}
              onToggle={() => toggleNode(folder.path)}
              onSelect={() => handleFolderClick(folder.path)}
              isSelected={isSelected}
            />
            {nodeState.expanded && (
              <FolderTree
                maipl_folder={props.maipl_folder}
                path_prefix={folder.path}
                tag={props.tag}
                shared={props.shared}
                onPathChange={props.onPathChange}
                currentPath={props.currentPath}
              />
            )}
          </R.Fragment>
        )
      })}
    </M.Box>
  )
}

/** Folder list view component */
export function FolderListView(props: FolderListViewProps) {
  const { data, isLoading } = useFolderQuery({
    path_prefix: props.path_prefix ?? "",
    maipl_folder: props.maipl_folder,
    tag: props.tag,
    shared: props.shared,
    page: props.pagination.pageIndex + 1,
    size: props.pagination.pageSize,
  })

  if (isLoading) {
    return <M.CircularProgress />
  }

  if (!data) {
    return <M.Typography>No data</M.Typography>
  }

  return (
    <M.Stack spacing={2}>
      {/* Folders */}
      {data.folders.length > 0 && (
        <M.Box>
          <M.Typography variant="subtitle2" sx={{ mb: 1 }}>
            Folders
          </M.Typography>
          <M.List>
            {data.folders.map((folder) => (
              <M.ListItem
                key={folder.path}
                button
                onClick={() => props.onFolderClick?.(folder.path)}
                secondaryAction={
                  <M.Chip
                    label={folder.file_count}
                    size="small"
                    variant="outlined"
                  />
                }
              >
                <M.ListItemIcon>
                  <I.Folder color="primary" />
                </M.ListItemIcon>
                <M.ListItemText
                  primary={folder.name}
                  secondary={`${folder.file_count} files`}
                />
              </M.ListItem>
            ))}
          </M.List>
        </M.Box>
      )}

      {/* Files */}
      {data.files.data.length > 0 && (
        <M.Box>
          <M.Typography variant="subtitle2" sx={{ mb: 1 }}>
            Files ({data.files.count})
          </M.Typography>
          <M.TableContainer>
            <M.Table size="small">
              <M.TableHead>
                <M.TableRow>
                  {props.selection && props.setSelection && (
                    <M.TableCell padding="checkbox" width={50}>
                      <M.Checkbox
                        indeterminate={
                          data.files.data.some((f) =>
                            props.selection?.has(f.id)
                          ) &&
                          !data.files.data.every((f) =>
                            props.selection?.has(f.id)
                          )
                        }
                        checked={data.files.data.every((f) =>
                          props.selection?.has(f.id)
                        )}
                        onChange={(e) => {
                          if (!props.setSelection) return
                          props.setSelection((prev) => {
                            const next = new Map(prev)
                            if (e.target.checked) {
                              data.files.data.forEach((file) => {
                                next.set(file.id, file)
                              })
                            } else {
                              data.files.data.forEach((file) => {
                                next.delete(file.id)
                              })
                            }
                            return next
                          })
                        }}
                        size="small"
                      />
                    </M.TableCell>
                  )}
                  <M.TableCell>Name</M.TableCell>
                  <M.TableCell>Size</M.TableCell>
                  <M.TableCell>Duration</M.TableCell>
                  <M.TableCell>Channels</M.TableCell>
                  <M.TableCell>Rate</M.TableCell>
                  <M.TableCell>Date</M.TableCell>
                  <M.TableCell>Tag</M.TableCell>
                  <M.TableCell>Ownership</M.TableCell>
                  <M.TableCell>Shared With</M.TableCell>
                  <M.TableCell>In Use</M.TableCell>
                  {props.FileActionsComponent && (
                    <M.TableCell width={50}></M.TableCell>
                  )}
                </M.TableRow>
              </M.TableHead>
              <M.TableBody>
                {data.files.data.map((file) => {
                  const isSelected = props.selection?.has(file.id) ?? false
                  const duration = File.safeMeta(file, "audio", "duration", 0)
                  const channels = File.safeMeta(file, "audio", "channels", 0)
                  const sampleRate = File.safeMeta(
                    file,
                    "audio",
                    "sample_rate",
                    0
                  )
                  const maipl = useMaipl()
                  const isOwner = file.user_id === maipl.user?.id

                  return (
                    <M.TableRow
                      key={file.id}
                      hover
                      selected={isSelected}
                      sx={{ cursor: "pointer" }}
                      onClick={() => props.onFileClick?.(file)}
                    >
                      {props.selection && props.setSelection && (
                        <M.TableCell padding="checkbox">
                          <M.Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              if (!props.setSelection) return
                              props.setSelection((prev) => {
                                const next = new Map(prev)
                                if (e.target.checked) {
                                  next.set(file.id, file)
                                } else {
                                  next.delete(file.id)
                                }
                                return next
                              })
                            }}
                            size="small"
                          />
                        </M.TableCell>
                      )}
                      <M.TableCell>
                        <M.Stack direction="row" alignItems="center" spacing={1}>
                          <I.InsertDriveFile fontSize="small" />
                          <M.Typography variant="body2">
                            {file.basename}
                          </M.Typography>
                        </M.Stack>
                      </M.TableCell>
                      <M.TableCell>{filesize(file.size)}</M.TableCell>
                      <M.TableCell>
                        {duration ? `${duration.toFixed(2)} sec` : "-"}
                      </M.TableCell>
                      <M.TableCell>{channels ?? "-"}</M.TableCell>
                      <M.TableCell>
                        {sampleRate ? `${sampleRate} Hz` : "-"}
                      </M.TableCell>
                      <M.TableCell>{fuzzyTime(file.created_at)}</M.TableCell>
                      <M.TableCell>
                        {props.onTagUpdate ? (
                          <EditableTagCell
                            initialValue={file.tag || ""}
                            onSave={(newValue) => {
                              props.onTagUpdate?.(file.id, newValue)
                            }}
                            isLoading={false}
                          />
                        ) : (
                          <M.Chip
                            label={file.tag || "—"}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </M.TableCell>
                      <M.TableCell>
                        <M.Box sx={{ display: "flex", justifyContent: "center" }}>
                          <M.Chip
                            icon={isOwner ? <I.Person /> : <I.People />}
                            label={isOwner ? "Owned" : "Shared"}
                            size="small"
                            color={isOwner ? "primary" : "secondary"}
                            variant="outlined"
                          />
                        </M.Box>
                      </M.TableCell>
                      <M.TableCell>
                        <M.Box sx={{ display: "flex", justifyContent: "center" }}>
                          <UserAvatarGroup users={file.shared_to} />
                        </M.Box>
                      </M.TableCell>
                      <M.TableCell>
                        <M.Box sx={{ display: "flex", justifyContent: "center" }}>
                          {file.in_use ? (
                            <I.CheckCircle color="success" fontSize="small" />
                          ) : (
                            <I.Cancel color="error" fontSize="small" />
                          )}
                        </M.Box>
                      </M.TableCell>
                      {props.FileActionsComponent && (
                        <M.TableCell>
                          <M.Box
                            onClick={(e) => e.stopPropagation()}
                            sx={{ display: "flex", justifyContent: "center" }}
                          >
                            <props.FileActionsComponent file={file} />
                          </M.Box>
                        </M.TableCell>
                      )}
                    </M.TableRow>
                  )
                })}
              </M.TableBody>
            </M.Table>
          </M.TableContainer>

          {/* Pagination */}
          <M.Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <M.Pagination
              count={Math.ceil(data.files.count / props.pagination.pageSize)}
              page={props.pagination.pageIndex + 1}
              onChange={(_, page) => {
                props.onPaginationChange({
                  ...props.pagination,
                  pageIndex: page - 1,
                })
              }}
            />
          </M.Box>
        </M.Box>
      )}

      {data.folders.length === 0 && data.files.data.length === 0 && (
        <M.Typography color="text.secondary">
          No folders or files in this directory
        </M.Typography>
      )}
    </M.Stack>
  )
}

