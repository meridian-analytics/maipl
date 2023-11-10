import * as M from "@mui/material"
import * as R from "react"
import * as RDC from "react-dom/client"
import * as RR from "react-router-dom"
import Signin from "./signin.tsx"
import theme from "./theme.tsx"

RDC.createRoot(document.getElementById("root") as HTMLElement).render(
  <R.StrictMode>
    <M.ThemeProvider theme={theme}>
      <RR.BrowserRouter basename={import.meta.env.BASE_URL || "/"}>
        <M.CssBaseline />
        <Signin />
      </RR.BrowserRouter>
    </M.ThemeProvider>
  </R.StrictMode>,
)
