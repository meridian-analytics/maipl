import { Batch } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"

function BatchActions(props: { batch: Batch.t_list_item }) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const status = Batch.status(props.batch)
  const [showLoading, setShowLoading] = R.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = R.useState(false)
  const navigate = RR.useNavigate()

  const onDelete = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = () => {
    if (deleteMutation.isIdle) {
      setShowDeleteDialog(false)
      return deleteMutation.mutateAsync([maipl.client, props.batch.id])
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
  }

  const onExport = () => {
    if (exportMutation.isIdle) {
      return exportMutation.mutateAsync([maipl.client, props.batch.id])
    }
  }

  const onProcess = () => {
    if (processMutation.isIdle) {
      return processMutation.mutateAsync([maipl.client, props.batch.id])
    }
  }

  const onCreateAnnotations = () => {
    setShowLoading(true)
    navigate(`/annotate/${props.batch.id}`)
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Batch.delete>) => {
      return Batch.delete(...vars)
    },
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not delete batch "{props.batch.batch_name}"
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("BatchActions deleteMutation error", err, vars)
      }
    },
    onSettled: () => {
      deleteMutation.reset()
    },
    onSuccess: () => {
      notify((onClose) => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Deleted batch "{props.batch.batch_name}"
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["batches"] })
    },
  })

  const exportMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Batch.export>) =>
      Batch.export(...vars),
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not export batch "{props.batch.batch_name}"
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("BatchActions exportMutation error", err, vars)
      }
    },
    onSettled: () => {
      exportMutation.reset()
    },
    onSuccess: (filename) => {
      notify((onClose) => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Exported "{props.batch.batch_name}" to {filename}
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["files"] })
    },
  })

  const processMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Batch.process>) =>
      Batch.process(...vars),
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not process batch "{props.batch.batch_name}"
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("BatchActions processMutation error", err, vars)
      }
    },
    onSettled: () => {
      processMutation.reset()
    },
    onSuccess: () => {
      notify((onClose) => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Started processing batch "{props.batch.batch_name} ..."
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["batches"] })
    },
  })

  // temporary quality of life feature:
  // user is unsure when the batch is done processing
  // automatically refresh once in 30 seconds, the processing should be complete by then
  R.useEffect(() => {
    const t = window.setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ["batches"] })
    }, 30000)
    return () => {
      window.clearTimeout(t)
    }
  }, [queryClient])

  return (
    <>
      <MR.Menu icon={<I.Settings />}>
        <M.MenuItem
          children="Submit for processing..."
          disabled={
            processMutation.isPending ||
            status == Batch.t_status.empty ||
            status == Batch.t_status.processing ||
            status == Batch.t_status.success
          }
          onClick={onProcess}
        />
        <M.Divider />
        <M.MenuItem
          children="View Settings"
          component={RR.Link}
          to={`/batches/${props.batch.id}`}
        />
        <M.MenuItem
          children="Share"
          component={RR.Link}
          disabled={props.batch.user_id != maipl.user?.id} // todo: batchpermissions
          to={`/batches/${props.batch.id}?tab=share`}
        />
        <M.Divider />
        <M.MenuItem
          children="Create Annotations"
          disabled={status !== Batch.t_status.success}
          onClick={onCreateAnnotations}
        />
        <M.MenuItem
          children="Export Annotations"
          disabled={exportMutation.isPending}
          onClick={onExport}
        />
        <M.Divider />
        <M.MenuItem
          children="Delete"
          disabled={deleteMutation.isPending}
          onClick={onDelete}
        />
      </MR.Menu>

      <M.Dialog
        open={showDeleteDialog}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          },
        }}
      >
        <M.DialogTitle>Delete Batch</M.DialogTitle>
        <M.DialogContent>
          <M.Typography>
            Are you sure you want to delete batch: {props.batch.batch_name}?
          </M.Typography>
        </M.DialogContent>
        <M.DialogActions>
          <M.Button onClick={handleDeleteCancel}>Cancel</M.Button>
          <M.Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            Delete
          </M.Button>
        </M.DialogActions>
      </M.Dialog>

      <M.Dialog
        open={showLoading}
        PaperProps={{
          sx: {
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          },
        }}
      >
        <M.CircularProgress size={60} />
        <M.Typography variant="h6" color="text.secondary">
          Loading annotation panel...
        </M.Typography>
        <M.Typography variant="body2" color="text.secondary" align="center">
          Please wait while we prepare the annotation interface
        </M.Typography>
      </M.Dialog>
    </>
  )
}

function BatchStatus(props: { batch: Batch.t_list_item }) {
  switch (Batch.status(props.batch)) {
    case Batch.t_status.empty:
      return <M.Chip label="Empty" size="small" />
    case Batch.t_status.error:
      return <M.Chip color="error" label="Error" size="small" />
    case Batch.t_status.processing:
      return <M.Chip color="info" label="Processing" size="small" />
    case Batch.t_status.success:
      return <M.Chip color="success" label="Ready" size="small" />
    case Batch.t_status.unprocessed:
      return <M.Chip color="warning" label="Unprocessed" size="small" />
    default:
      return <M.Chip color="default" label={Batch.status(props.batch)} size="small" />
  }
}

function ShareAvatars(props: { batch: Batch.t_list_item }) {
  const maipl = MR.useMaipl()
  return (
    <MR.UserAvatarGroup
      users={
        props.batch.user_id != maipl.user?.id
          ? [props.batch.owner]
          : props.batch.shared_to.map(([user, _role]) => user)
      }
    />
  )
}

export default function BatchesTable(props: { sx?: M.SxProps }) {
  const maipl = MR.useMaipl()
  const queryClient = RQ.useQueryClient()
  const notify = MR.useNotify()

  const {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = MR.Batches.useTable()

  const [pollingEnabled, setPollingEnabled] = R.useState(true)
  const [lastRefreshTime, setLastRefreshTime] = R.useState<Date>(new Date())
  const [deleteModalOpen, setDeleteModalOpen] = R.useState(false)

  const { data: batches } = MR.Batches.useQuery({
    // filters
    name: debouncedFilter.get("name"),
    user: maipl.user?.id,
    // pagination
    page: pagination.pageIndex + 1, // bug: when query changes, page needs to be reset
    size: pagination.pageSize,
    // polling
    polling: pollingEnabled,
  })

  R.useEffect(() => {
    if (batches) setLastRefreshTime(new Date())
  }, [batches])

  const togglePolling = () => {
    setPollingEnabled(!pollingEnabled)
    if (pollingEnabled) {
      queryClient.refetchQueries({ queryKey: ["batches", "list"] })
    }
  }

  const onDeleteSelected = () => {
    if (selection.size === 0) return
    setDeleteModalOpen(true)
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Batch.deleteBulk>) => {
      return Batch.deleteBulk(...vars)
    },
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not delete {vars[1].length} batch{vars[1].length !== 1 ? 'es' : ''}
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("BatchesTable deleteMutation error", err, vars)
      }
    },
    onSettled: () => {
      deleteMutation.reset()
    },
    onSuccess: (_data, vars) => {
      notify((onClose) => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Deleted {vars[1].length} batch{vars[1].length !== 1 ? 'es' : ''}
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["batches"] })
      setSelection(new Map())
    },
  })

  const handleDeleteConfirm = () => {
    const selectedBatches = batches?.data?.filter(batch => selection.has(batch.id)) || []
    const deletableBatches = selectedBatches.filter(batch => batch.user_id === maipl.user?.id)
    
    if (deleteMutation.isIdle && deletableBatches.length > 0) {
      deleteMutation.mutateAsync([maipl.client, deletableBatches.map(batch => batch.id)])
    }
    setDeleteModalOpen(false)
  }

  const columns = R.useMemo(
    () => [
      MR.Batches.column.display({
        id: "role",
        header: "Role",
        cell: (info) => <M.Typography>{info.row.original.role?.name ?? 'Owner'}</M.Typography>,
        size: 100,
      }),
      MR.Batches.column.display({
        id: "status",
        header: "Status",
        cell: (info) => <BatchStatus batch={info.row.original} />,
        size: 80,
      }),
      MR.Batches.column.display({
        id: "share",
        header: "Share",
        cell: (info) => <ShareAvatars batch={info.row.original} />,
        size: 80,
      }),
      MR.Batches.column.display({
        id: "actions",
        header: "",
        cell: (info) => <BatchActions batch={info.row.original} />,
        size: 50,
      }),
    ],
    []
  )

  return (
    <M.Stack
      sx={{
        flexGrow: 1,
        maxHeight: "100%",
        overflow: "hidden",
        padding: 2,
        ...props.sx,
      }}
    >
      <RR.Outlet />
      <M.Stack direction="row" alignItems="center" spacing={2}>
        <M.TextField
          label="Name"
          onChange={(e) => filter.set("name", e.currentTarget.value)}
          placeholder="Batch name..."
          value={filter.get("name")}
        />
        <M.Stack flexGrow={1} />
        {pollingEnabled && (
          <M.Typography variant="caption" color="text.secondary">
            Auto-refreshing every 5s • Last: {lastRefreshTime.toLocaleTimeString()}
          </M.Typography>
        )}
        <MR.ActionButton
          children={<I.Refresh />}
          onClick={() => {
            queryClient.refetchQueries({ queryKey: ["batches", "list"] })
          }}
          title="Refresh"
        />
        <MR.ActionButton
          children={pollingEnabled ? <I.Pause /> : <I.PlayArrow />}
          onClick={togglePolling}
          title={pollingEnabled ? "Disable Auto-refresh" : "Enable Auto-refresh"}
          color={pollingEnabled ? "primary" : "default"}
        />
        <MR.ActionButton
          children={<I.Delete />}
          onClick={onDeleteSelected}
          title="Delete Selected Batches"
          disabled={selection.size === 0}
          color={selection.size > 0 ? "error" : "default"}
        />
        <MR.ActionButton
          children={<I.AddCircle />}
          component={RR.Link}
          title="Create Batch"
          to="/batches/new"
        />
      </M.Stack>
      <MR.Batches.Table
        rows={batches.data}
        columns={columns}
        count={batches.count}
        pagination={pagination}
        selection={selection}
        setPagination={setPagination}
        setSelection={setSelection}
        visibility={{
          progress: false,
          select: true,
          user_id: false,
        }}
      />
      <DeleteBatchesDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        batches={batches?.data?.filter(batch => selection.has(batch.id)) || []}
        deletableBatches={batches?.data?.filter(batch => selection.has(batch.id) && batch.user_id === maipl.user?.id) || []}
        isPending={deleteMutation.isPending}
      />
    </M.Stack>
  )
}

function DeleteBatchesDialog(props: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  batches: Array<Batch.t_list_item>
  deletableBatches: Array<Batch.t_list_item>
  isPending?: boolean
}) {
  return (
    <M.Dialog
      open={props.open}
      onClose={props.onClose}
      aria-labelledby="delete-batches-dialog-title"
      aria-describedby="delete-batches-dialog-description"
    >
      <M.DialogTitle id="delete-batches-dialog-title">
        {props.batches.length === 1 ? "Delete Batch" : "Delete Selected Batches"}
      </M.DialogTitle>
      <M.DialogContent>
        <M.DialogContentText id="delete-batches-dialog-description">
          You are about to delete {props.deletableBatches.length} batch{props.deletableBatches.length !== 1 ? 'es' : ''}.
          {props.batches.length !== props.deletableBatches.length && (
            <M.Typography color="error" variant="body2" sx={{ mt: 1 }}>
              Note: {props.batches.length - props.deletableBatches.length} batch{props.batches.length - props.deletableBatches.length !== 1 ? 'es' : ''} cannot be deleted because you don't own them.
            </M.Typography>
          )}
        </M.DialogContentText>
        <M.List>
          {props.deletableBatches.map(batch => (
            <M.ListItem key={batch.id}>
              <M.ListItemText
                primary={batch.batch_name}
                secondary={`Status: ${Batch.status(batch)}`}
              />
            </M.ListItem>
          ))}
        </M.List>
      </M.DialogContent>
      <M.DialogActions>
        <M.Button onClick={props.onClose}>Cancel</M.Button>
        <M.Button 
          onClick={props.onConfirm} 
          color="error"
          variant="contained"
          disabled={props.isPending || props.deletableBatches.length === 0}
        >
          {props.isPending ? "Deleting..." : "Delete"}
        </M.Button>
      </M.DialogActions>
    </M.Dialog>
  )
}
