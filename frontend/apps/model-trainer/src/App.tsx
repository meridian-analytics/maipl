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
        <MR.Navbar />
        <RR.Outlet />
      </M.Stack>
    </>
  )
}

const router: MR.t_router = (context) => [
  {
    element: <Layout />,
    children: [
      {
        path: "",
        element: <Tasks />,
        children: [
          { path: "edit-task", element: <EditTaskLoader /> },
          { path: "console/:taskId", element: <ConsoleLoader /> },
          { path: "log/:taskId", element: <LogLoader /> },
        ],
      },
    ],
  },
]
