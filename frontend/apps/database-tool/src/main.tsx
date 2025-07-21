import * as R from "react"
import * as RDC from "react-dom/client"
import App from "./App"

RDC.createRoot(document.getElementById("root")!).render(
  <R.StrictMode>
    <App />
  </R.StrictMode>,
) 