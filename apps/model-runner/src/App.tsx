import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Detections from "./Detections.tsx"
import Tasks from "./Tasks.tsx"

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
    <MR.MaiplProvider>
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
        <RR.Routes>
          <RR.Route path="detections" element={<Detections />} />
          <RR.Route path="tasks/*" element={<Tasks />} />
          <RR.Route path="*" element={<RR.Navigate to="/tasks" replace />} />
        </RR.Routes>
      </M.Stack>
    </MR.MaiplProvider>
  )
}
