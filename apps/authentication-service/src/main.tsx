import * as M from "@mui/material"
import * as R from "react"
import * as RDC from "react-dom/client"
import * as RR from "react-router-dom"
import Signin from "./signin.js"
import theme from "./theme.js"

RDC.createRoot(document.getElementById("root") as HTMLElement).render(
  <R.StrictMode>
    <M.ThemeProvider theme={theme}>
      <RR.BrowserRouter>
        <M.CssBaseline />
        <Signin />
      </RR.BrowserRouter>
    </M.ThemeProvider>
  </R.StrictMode>,
)
