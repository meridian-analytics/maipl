import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import FileEditor from "./FileEditor.tsx"
import FileUpload from "./FileUpload.tsx"
import Files from "./Files.tsx"

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
    element: <Files />,
    children: [
      {
        path: "upload",
        element: <FileUpload />,
      },
      {
        path: "new",
        element: <FileEditor />,
      },
      {
        path: ":fileId/edit",
        element: <FileEditor />,
      },
    ],
  },
]
