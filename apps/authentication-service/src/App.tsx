import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Signin from "./signin.tsx"

export default function App() {
  const router = RR.createBrowserRouter(
    [
      {
        element: <Layout />,
        children: routes,
      },
    ],
    {
      basename: import.meta.env.BASE_URL || "/",
    },
  )
  return (
    <MR.MaiplRootProvider>
      <RR.RouterProvider router={router} />
    </MR.MaiplRootProvider>
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
      <RR.Outlet />
    </M.Stack>
  )
}

const routes: Array<RR.RouteObject> = [
  {
    index: true,
    element: <RR.Navigate to="/signin" replace />,
  },
  {
    path: "/signin",
    element: <Signin />,
  },
]
