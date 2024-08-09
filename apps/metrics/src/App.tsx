import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import MetricsPanel from "./MetricsPanel"
import * as Output from "./Output"
import * as FileShare from "../../file-service/src/FileShare"

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
      <M.Tabs value={tab ?? "Metrics"} indicatorColor='primary'>
        <M.Tab
          component={RR.Link}
          label='Metrics'
          to='/metrics'
          value='metrics'
        />
        <M.Tab
          component={RR.Link}
          label='Output'
          to={`/output`}
          value='output'
        />
      </M.Tabs>
    </M.Stack>
  )
}

const router: MR.t_router = (context) => [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <RR.Navigate to='/metrics' replace />,
      },
      {
        path: "metrics",
        element: <MetricsPanel />,
      },
      {
        path: "output",
        element: Output.element,
        loader: Output.loader(context),
        errorElement: <MR.ErrorModal />,
        children: [
          {
            path: "share",
            element: FileShare.element,
            errorElement: <MR.ErrorModal />,
            loader: FileShare.loader(context),
          },
        ],
      },
    ],
  },
]
