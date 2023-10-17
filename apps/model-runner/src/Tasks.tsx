import { Task } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import EditTask from "./EditTask.js"
import ShowTask from "./ShowTask.js"

function TaskActions(props: { task: Task.t }) {
  const queryClient = RQ.useQueryClient()
  const [anchorEl, setAnchorEl] = R.useState<HTMLElement | null>(null)
  const buttonId = R.useId()
  const menuId = R.useId()
  const { client } = MR.useMaipl()
  const open = anchorEl != null

  const startMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Task.start>) => Task.start(...vars),
    onSettled: () => {
      queryClient.refetchQueries(["tasks"])
    },
  })

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const onClose = () => {
    setAnchorEl(null)
  }

  const onStart = async () => {
    try {
      await startMutation.mutateAsync([client, props.task.id])
    } catch (error) {
      console.error("Tasks onStart error", error)
    }
  }

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
          disabled={props.task.status != "CREATED" && startMutation.isIdle}
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
          path=":taskId"
          element={<ShowTask onClose={() => navigate("/tasks")} />}
        />
      </RR.Routes>
      <M.Stack direction="row" spacing={2}>
        <M.Stack flexGrow={1} />
        <M.Tooltip title="Create Task">
          <M.IconButton
            children={<I.AddCircle />}
            component={RR.Link}
            to={"/tasks/new"}
          />
        </M.Tooltip>
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
