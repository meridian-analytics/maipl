import { TrainerTask } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import * as R from "react"

function TaskActions(props: { task: Task.t }) {
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const onDelete = () => {
    if (
      deleteMutation.isIdle &&
      confirm(`Are you sure you want to delete task #${props.task.id}?`)
    ) {
      return deleteMutation.mutateAsync([maipl.client, props.task.id])
    }
  }

  const onStart = () => {
    if (startMutation.isIdle) {
      return startMutation.mutateAsync([maipl.client, props.task.id])
    }
  }

  const deleteMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Task.delete>) => {
      return Task.delete(...vars)
    },
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert severity="error" onClose={onClose}>
          Error: Could not delete task #{vars[1]}
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("TaskActions deleteMutation error", err, vars)
      }
    },
    onSettled: () => {
      deleteMutation.reset()
    },
    onSuccess: (_data, vars) => {
      notify((onClose) => (
        <M.Alert severity="success" onClose={onClose}>
          Success: Deleted task #{vars[1]}
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["tasks"] })
    },
  })

  const startMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Task.start>) => Task.start(...vars),
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not start task #{vars[1]}
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("Tasks startMutation error", err, vars)
      }
    },
    onSettled: () => {
      startMutation.reset()
      queryClient.refetchQueries({ queryKey: ["tasks"] })
    },
    onSuccess: (task) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="success">
          Success: Started task #{task.id} ...
        </M.Alert>
      ))
    },
  })

  return (
    <MR.Menu icon={<I.Settings />}>
      <M.MenuItem
        children="Details"
        component={RR.Link}
        to={`/${props.task.id}`}
      />
      <M.MenuItem
        disabled={props.task.status != "CREATED" || startMutation.isPending}
        onClick={onStart}
        children="Start"
      />
      <M.MenuItem
        disabled={
          props.task.status != "PENDING" && props.task.status != "STARTED"
        }
        onClick={() => {
          console.warn("TaskActions cancelMutation not implemented")
        }}
        children="Cancel"
      />
      <M.Divider />
      <M.MenuItem
        children="Copy"
        component={RR.Link}
        to={`/${props.task.id}/copy`}
      />
      <M.MenuItem
        disabled={
          props.task.status == "PENDING" ||
          props.task.status == "STARTED" ||
          deleteMutation.isPending
        }
        onClick={onDelete}
        children="Delete"
      />
    </MR.Menu>
  )
}

const Tasks = (props: { sx?: M.SxProps }) => {
  const maipl = MR.useMaipl()
  const queryClient = RQ.useQueryClient()
  const {
    filter,
    debouncedFilter,
    pagination,
    selection,
    setPagination,
    setSelection,
  } = MR.TrainerTasks.useTable()

  const { data: tasks } = MR.TrainerTasks.useQuery({
    // filters
    name: debouncedFilter.get("name"),
    user: maipl.user?.id,
    // pagination
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  })

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
        <M.Stack flexGrow={1} />
        <MR.ActionButton
          children={<I.AddCircle />}
          component={RR.Link}
          title="Create Task"
          to="/new-tasks/edit-task"
        />
        <MR.ActionButton
          children={<I.Refresh />}
          onClick={() => {
            queryClient.refetchQueries({ queryKey: ["trainer_tasks", "list"] })
          }}
          title="Refresh"
        />
      </M.Stack>
      <MR.TrainerTasks.Table
        columns={[
          MR.TrainerTasks.column.display({
            id: "actions",
            header: "",
            cell: ({ row }) => <TaskActions task={row.original} />,
          }),
        ]}
        rows={tasks}
        count={tasks.length || 0}
        pagination={pagination}
        selection={selection}
        setPagination={setPagination}
        setSelection={setSelection}
        visibility={{
          select: false,
        }}
      />
    </M.Stack>
  )
}

export default Tasks
