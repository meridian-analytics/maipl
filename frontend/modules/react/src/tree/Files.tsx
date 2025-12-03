import { File } from "@maipl/api"
import * as M from "@mui/material"
import * as I from "@mui/icons-material"
import * as R from "react"
import * as RQ from "@tanstack/react-query"
import { useMaipl } from "../context"
import type { PaginationState } from "../table/Table"

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
          <M.List>
            {data.files.data.map((file) => (
              <M.ListItem
                key={file.id}
                button
                onClick={() => props.onFileClick?.(file)}
                secondaryAction={
                  <M.Typography variant="caption" color="text.secondary">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </M.Typography>
                }
              >
                <M.ListItemIcon>
                  <I.InsertDriveFile />
                </M.ListItemIcon>
                <M.ListItemText
                  primary={file.basename}
                  secondary={file.path}
                />
              </M.ListItem>
            ))}
          </M.List>

          {/* Pagination */}
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
      )}

      {data.folders.length === 0 && data.files.data.length === 0 && (
        <M.Typography color="text.secondary">
          No folders or files in this directory
        </M.Typography>
      )}
    </M.Stack>
  )
}

