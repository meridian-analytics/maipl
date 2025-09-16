import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Signin from "./signin"

export default function App() {
  const router = RR.createBrowserRouter(routes, {
    basename: import.meta.env["BASE_URL"] || "/",
  })
  return (
    <MR.MaiplRootProvider>
      <RR.RouterProvider router={router} />
    </MR.MaiplRootProvider>
  )
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
        <RR.Outlet />
      </M.Stack>
    </>
  )
}

const routes: Array<RR.RouteObject> = [
  {
    element: <Layout />,
    children: [
      {
        index: true,
        element: <RR.Navigate to="/signin" replace />,
      },
      {
        path: "/signin",
        element: <Signin />,
      },
    ],
  },
]
