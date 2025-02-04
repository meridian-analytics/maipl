import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Tasks from "./Tasks"
import EditTaskLoader from "./EditTask"
import ConsoleLoader from "./Console"
import LogLoader from "./Log"
export default function App() {
  return <MR.MaiplProvider router={router} />
}

function Layout() {
  return (
    <>
      <MR.Notifications />
      <M.Stack
        sx={{
          backgroundColor: M.colors.grey[50],
          height: "100vh",
          maxHeight: "100vh",
        }}
      >
        <MR.Navbar>
          <LocalNavigation />
        </MR.Navbar>
        <RR.Outlet />
      </M.Stack>
    </>
  )
}

function LocalNavigation() {
  const taskId = RR.useMatch("/edit-task/:taskId/*")?.params?.taskId
  const tab = RR.useMatch("/:tab/*")?.params?.tab

  return (
    <M.Stack direction="row" flexGrow={1} justifyContent="center">
      <M.Tabs value={tab ?? "new-tasks"} indicatorColor="primary">
        <M.Tab
          component={RR.Link}
          label="New Tasks"
          to="/new-tasks"
          value="new-tasks"
        />
        <M.Tab
          component={RR.Link}
          label="Continue Tasks"
          to="/continue-tasks"
          value="continue-tasks"
        />
      </M.Tabs>
    </M.Stack>
  )
}

const router: MR.t_router = (context) => [
  {
    element: <Layout />,
    children: [
      {
        index: true,
        element: <RR.Navigate to="/new-tasks" replace />,
      },
      {
        path: "new-tasks",
        element: <Tasks />,
        children: [
          {
            path: "edit-task",
            element: <EditTaskLoader />,
          },
          {
            path: "console/:taskId",
            element: <ConsoleLoader />,
          },
          {
            path: "log/:taskId",
            element: <LogLoader />,
          },
        ],
      },
      {
        path: "continue-tasks",
        element: <Tasks />,
        children: [
          {
            path: "edit-task",
            element: <EditTaskLoader />,
          },
        ],
      },
    ],
  },
]
