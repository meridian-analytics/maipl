import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Detections from "./Detections"
import EditTask from "./EditTask"
import ShowTask from "./ShowTask"
import Tasks from "./Tasks"

export default function App() {
  return <MR.MaiplProvider router={router} />
}

function Layout() {
  return (
    <M.Stack
      sx={{
        backgroundColor: M.colors.grey[50],
        height: "100vh",
        maxHeight: "100vh",
      }}
    >
      <MR.Notifications />
      <MR.Navbar />
      <RR.Outlet />
    </M.Stack>
  )
}

const router: MR.t_router = () => [
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Tasks />,
        children: [
          {
            path: "new",
            element: <EditTask />,
          },
          {
            path: ":taskId/copy",
            element: <EditTask />,
          },
          {
            path: ":taskId/detections",
            element: <Detections />,
          },
          {
            path: ":taskId",
            element: <ShowTask />,
          },
        ],
      },
    ],
  },
]
