import { Task } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import Detections from "./Detections.tsx"
import EditTask from "./EditTask.tsx"
import ShowTask from "./ShowTask.tsx"

function TaskActions(props: { task: Task.t }) {
  const queryClient = RQ.useQueryClient()
  const [anchorEl, setAnchorEl] = R.useState<HTMLElement | null>(null)
  const buttonId = R.useId()
  const menuId = R.useId()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const open = anchorEl != null

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const onClose = () => {
    setAnchorEl(null)
  }

  const onStart = () => {
    if (startMutation.isIdle) {
      return startMutation.mutateAsync([maipl.client, props.task.id])
    }
  }

  const startMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Task.start>) => Task.start(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not start task #{vars[1]}
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("Tasks startMutation error", err, vars)
      }
    },
    onSuccess: task => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Started task #{task.id} ...
        </M.Alert>
      ))
    },
    onSettled: () => {
      queryClient.refetchQueries(["tasks"])
    },
  })

  return (
    <>
      <M.IconButton
        aria-controls={open ? menuId : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        children={<I.ContentPasteSearch />}
        id={buttonId}
        onClick={onClick}
      />
      <M.Menu
        anchorEl={anchorEl}
        id={menuId}
        open={open}
        onClick={onClose}
        onClose={onClose}
        MenuListProps={{
          "aria-labelledby": buttonId,
        }}
      >
        <M.MenuItem
          children="Details"
          component={RR.Link}
          to={`/tasks/${props.task.id}`}
        />
        <M.MenuItem
          children="Detections"
          disabled={props.task.detections == null}
          component={RR.Link}
          to={`/tasks/${props.task.id}/detections`}
        />
        <M.MenuItem
          disabled={props.task.status != "CREATED" || startMutation.isLoading}
          onClick={onStart}
          children="Start"
        />
        <M.MenuItem
          disabled={
            props.task.status != "PENDING" && props.task.status != "STARTED"
          }
          onClick={() => {}}
          children="Cancel"
        />
        <M.Divider />
        <M.MenuItem
          children="Copy"
          component={RR.Link}
          to={`/tasks/${props.task.id}/copy`}
        />
        <M.MenuItem
          disabled={
            props.task.status == "PENDING" || props.task.status == "STARTED"
          }
          onClick={() => {}}
          children="Delete"
        />
      </M.Menu>
    </>
  )
}

export default function TasksTable(props: {
  sx?: M.SxProps
}) {
  const navigate = RR.useNavigate()
  const queryClient = RQ.useQueryClient()
  const { pagination, selection, setPagination, setSelection } =
    MR.Tasks.useTable()

  const { data: tasks } = MR.Tasks.useQuery()

  // hack: refresh tasks every 30 seconds
  R.useEffect(() => {
    const t = setTimeout(() => {
      queryClient.refetchQueries(["tasks", "list"])
    }, 30000)
    return () => clearTimeout(t)
  })

  return (
    <M.Stack
      spacing={2}
      sx={{
        flexGrow: 1,
        maxHeight: "100%",
        overflow: "hidden",
        padding: 2,
        ...props.sx,
      }}
    >
      <RR.Routes>
        <RR.Route
          path="new"
          element={<EditTask onClose={() => navigate("/tasks")} />}
        />
        <RR.Route
          path=":taskId/copy"
          element={<EditTask onClose={() => navigate("/tasks")} />}
        />
        <RR.Route
          path=":taskId/detections"
          element={<Detections onClose={() => navigate("/tasks")} />}
        />
        <RR.Route
          path=":taskId"
          element={<ShowTask onClose={() => navigate("/tasks")} />}
        />
      </RR.Routes>
      <M.Stack direction="row" spacing={2}>
        <M.Stack flexGrow={1} />
        <MR.ActionButton
          children={<I.AddCircle />}
          component={RR.Link}
          title="Create Task"
          to={"/tasks/new"}
        />
      </M.Stack>
      <MR.Tasks.Table
        columns={[
          MR.Tasks.column.display({
            id: "actions",
            header: "",
            cell: ({ row }) => <TaskActions task={row.original} />,
          }),
        ]}
        rows={tasks}
        count={tasks.length}
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
