import * as R from "react"
import * as RDC from "react-dom/client"
import App from "./App.tsx"

const root = RDC.createRoot(document.getElementById("root") as HTMLElement)

root.render(
  <R.StrictMode>
    <App />
  </R.StrictMode>,
)
