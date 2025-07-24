import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import DatabaseHome from "./DatabaseHome"
import TaskDetailView from "./components/TaskDetailView"
import TaskWorkspace from "./components/TaskWorkspace"

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
        <MR.Navbar />
        <RR.Outlet />
      </M.Stack>
    </>
  )
}

function TaskDetail() {
  return <TaskWorkspace />
}

const router: MR.t_router = () => [
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <DatabaseHome />,
        children: [
          {
            path: ":taskId",
            element: <TaskDetail />,
          },
          {
            path: ":taskId/copy",
            element: <TaskDetail />,
          },
        ],
      },
    ],
  },
] 