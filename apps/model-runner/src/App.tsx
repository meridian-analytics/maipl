import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Detections from "./Detections.tsx"
import EditTask from "./EditTask.tsx"
import ShowTask from "./ShowTask.tsx"
import Tasks from "./Tasks.tsx"

export default function App() {
  return (
    <MR.MaiplProvider
      routes={[
        {
          element: <Layout />,
          children: routes,
        },
      ]}
    />
  )
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

const routes: Array<RR.RouteObject> = [
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
]
