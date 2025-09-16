import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import Modal from "./Modal"

export default function ErrorModal() {
  const error = RR.useRouteError() as Error
  const navigate = RR.useNavigate()
  return (
    <Modal onClose={() => navigate(-1)}>
      <M.Stack padding={2}>
        <M.Stack direction="row" alignItems="center">
          <I.PestControl fontSize="large" />
          <M.Typography variant="h4">Bugger!</M.Typography>
        </M.Stack>
        <M.Alert severity="error">
          {import.meta.env["PROD"]
            ? "Oops, something went wrong..."
            : error.message}
        </M.Alert>
        <M.Stack direction="row-reverse">
          <M.Button color="primary" children="Go Back" />
        </M.Stack>
      </M.Stack>
    </Modal>
  )
}
