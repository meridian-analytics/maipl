import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Tasks from "./Tasks.tsx"

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
        <MR.Notifications />
        <MR.Navbar />
        <RR.Routes>
          <RR.Route path="tasks/*" element={<Tasks />} />
          <RR.Route path="*" element={<RR.Navigate to="/tasks" replace />} />
        </RR.Routes>
      </M.Stack>
    </MR.MaiplProvider>
  )
}
