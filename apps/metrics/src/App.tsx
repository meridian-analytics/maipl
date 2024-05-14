import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"

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

const router: MR.t_router = () => [
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <M.Typography variant="h1">Hello, metrics!</M.Typography>,
      },
    ],
  },
]
