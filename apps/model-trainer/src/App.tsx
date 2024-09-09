import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Tasks from "./Tasks"

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
  const tab = RR.useMatch("/:tab/*")?.params?.tab
  return (
    <M.Stack direction='row' flexGrow={1} justifyContent='center'>
      <M.Tabs value={tab ?? "Tasks"} indicatorColor='primary'>
        <M.Tab
          component={RR.Link}
          label='Tasks'
          to='/tasks'
          value='tasks'
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
        element: <RR.Navigate to='/tasks' replace />,
      },
      {
        path: "tasks",
        element: <Tasks />,
      },
    ],
  },
]
