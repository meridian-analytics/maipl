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
      return <M.Chip label="Empty" />
    case Batch.t_status.error:
      return <M.Chip color="error" label="Error" />
    case Batch.t_status.processing:
      return <M.Chip color="info" label="Processing" />
    case Batch.t_status.success:
      return <M.Chip color="success" label="Ready" />
    case Batch.t_status.unprocessed:
      return <M.Chip color="warning" label="Unprocessed" />
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

  const {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = MR.Batches.useTable()

  const { data: batches } = MR.Batches.useQuery({
    // filters
    name: debouncedFilter.get("name"),
    user: maipl.user?.id,
    // pagination
    page: pagination.pageIndex + 1, // bug: when query changes, page needs to be reset
    size: pagination.pageSize,
  })

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
      <M.Stack direction="row">
        <M.TextField
          label="Name"
          onChange={(e) => filter.set("name", e.currentTarget.value)}
          placeholder="Batch name..."
          value={filter.get("name")}
        />
        <M.Stack flexGrow={1} />
        <MR.ActionButton
          children={<I.Refresh />}
          onClick={() => {
            queryClient.refetchQueries({ queryKey: ["batches", "list"] })
          }}
          title="Refresh"
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
          select: false,
          user_id: false,
        }}
      />
    </M.Stack>
  )
}
