import * as R from "react"
import * as RDC from "react-dom/client"
import App from "./App.js"

RDC.createRoot(document.getElementById("root")!).render(
  <R.StrictMode>
    <App />
  </R.StrictMode>,
)
