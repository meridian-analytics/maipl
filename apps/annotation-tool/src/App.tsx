import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import AnnotationTool from "./AnnotationTool.tsx"
import Batches from "./Batches.tsx"
import EditBatch from "./NewBatch.tsx"
import ShowBatch from "./ShowBatch.tsx"

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
      <MR.Navbar>
        <LocalNavigation />
      </MR.Navbar>
      <RR.Outlet />
    </M.Stack>
  )
}

function LocalNavigation() {
  const batchId = RR.useMatch("/annotate/:batchId/*")?.params?.batchId
  const tab = RR.useMatch("/:tab/*")?.params?.tab
  return (
    <M.Stack direction="row" flexGrow={1} justifyContent="center">
      <M.Tabs value={tab ?? "batches"} indicatorColor="primary">
        <M.Tab
          component={RR.Link}
          label="Batches"
          to="/batches"
          value="batches"
        />
        <M.Tab
          component={RR.Link}
          disabled={batchId == null}
          label="Annotate"
          to={`/annotate/${batchId}`}
          value="annotate"
        />
      </M.Tabs>
    </M.Stack>
  )
}

const router: MR.t_router = () => [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <RR.Navigate to="/batches" replace />,
      },
      {
        path: "batches",
        element: <Batches />,
        children: [
          {
            path: "new",
            element: <EditBatch />,
          },
          {
            path: ":batchId",
            element: <ShowBatch />,
          },
        ],
      },
      {
        path: "annotate/:batchId",
        element: <AnnotationTool />,
        children: [
          {
            path: "segment/:segmentId",
            element: <AnnotationTool />,
          },
        ],
      },
    ],
  },
]
