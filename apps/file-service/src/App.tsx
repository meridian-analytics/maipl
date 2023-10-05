import { MaiplProvider } from "@maipl/common/context"
import * as UI from "@maipl/common/ui"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Files from "./Files.js"

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
        <UI.Navbar />
        <RR.Routes>
          <RR.Route path="files/*" element={<Files />} />
          <RR.Route path="*" element={<RR.Navigate to="/files" replace />} />
        </RR.Routes>
      </M.Stack>
    </MaiplProvider>
  )
}
