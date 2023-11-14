import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import AnnotationTool from "./AnnotationTool.tsx"
import Batches from "./Batches.tsx"
import EditBatch from "./EditBatch.tsx"
import Files from "./Files.tsx"
import Segments from "./Segments.tsx"

export default function App() {
  return (
    <MR.MaiplProvider
      routes={[
        {
          path: "/",
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
      <M.Tabs value={tab ?? "files"} indicatorColor="primary">
        <M.Tab component={RR.Link} label="Files" to="/files" value="files" />
        <M.Tab
          component={RR.Link}
          label="Batches"
          to="/batches"
          value="batches"
        />
        <M.Tab
          component={RR.Link}
          label="Segments"
          to="/segments"
          value="segments"
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

const routes: Array<RR.RouteObject> = [
  {
    index: true,
    element: <RR.Navigate to="/files" replace />,
  },
  {
    path: "files",
    element: <Files />,
  },
  {
    path: "batches",
    element: <Batches />,
    children: [
      {
        path: ":batchId",
        element: <EditBatch isNew={false} />,
      },
      {
        path: "new",
        element: <EditBatch isNew={true} />,
      },
    ],
  },
  {
    path: "segments",
    element: <Segments />,
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
]
