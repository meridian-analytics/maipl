import { MaiplProvider } from "@maipl/common/context"
import * as UI from "@maipl/common/ui"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import AnnotationTool from "./AnnotationTool.js"
import Batches from "./Batches.js"
import Files from "./Files.jsx"
import Segments from "./Segments.jsx"

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

export default function App() {
  return (
    <MaiplProvider>
      <M.Stack
        sx={{
          backgroundColor: M.colors.grey[50],
          height: "100vh",
          maxHeight: "100vh",
        }}
      >
        <UI.Navbar>
          <LocalNavigation />
        </UI.Navbar>
        <RR.Routes>
          <RR.Route path="/" element={<RR.Navigate to="/files" replace />} />
          <RR.Route path="files" element={<Files />} />
          <RR.Route path="batches/*" element={<Batches />} />
          <RR.Route path="segments" element={<Segments />} />
          <RR.Route path="annotate/:batchId" element={<AnnotationTool />} />
          <RR.Route
            path="annotate/:batchId/segment/:segmentId"
            element={<AnnotationTool />}
          />
        </RR.Routes>
      </M.Stack>
    </MaiplProvider>
  )
}
