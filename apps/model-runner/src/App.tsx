import { MaiplProvider } from "@maipl/common/context"
import * as UI from "@maipl/common/ui"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Detections from "./Detections.js"
import Tasks from "./Tasks.js"

function LocalNavigation() {
  const tab = RR.useMatch("/:tab/*")?.params?.tab
  return (
    <M.Stack direction="row" flexGrow={1} justifyContent="center">
      <M.Tabs value={tab ?? "tasks"} indicatorColor="primary">
        <M.Tab component={RR.Link} label="Tasks" to="/tasks" value="tasks" />
        <M.Tab
          component={RR.Link}
          label="Detections"
          to="/detections"
          value="detections"
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
          <RR.Route path="detections" element={<Detections />} />
          <RR.Route path="tasks/*" element={<Tasks />} />
          <RR.Route path="*" element={<RR.Navigate to="/tasks" replace />} />
        </RR.Routes>
      </M.Stack>
    </MaiplProvider>
  )
}
