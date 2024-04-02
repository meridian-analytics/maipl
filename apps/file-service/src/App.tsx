import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import { EditFile, NewFile } from "./FileEditor"
import * as FileUpload from "./FileUpload"
import * as Files from "./Files"

export default function App() {
  return <MR.MaiplProvider router={router} />
}

function Layout() {
  return (
    <M.Stack
      sx={{
        backgroundColor: M.colors.grey[50],
        height: "100vh",
        maxHeight: "100vh",
      }}
    >
      <MR.Notifications />
      <MR.Navbar />
      <RR.Outlet />
    </M.Stack>
  )
}

const router: MR.t_router = context => [
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: Files.element,
        errorElement: <ErrorModal />,
        loader: Files.loader(context),
        children: [
          {
            path: "upload",
            element: FileUpload.element,
            errorElement: <ErrorModal />,
            loader: FileUpload.loader(context),
          },
          {
            path: "new",
            element: NewFile.element,
            errorElement: <ErrorModal />,
            loader: NewFile.loader(context),
          },
          {
            path: ":fileId/edit",
            element: EditFile.element,
            errorElement: <ErrorModal />,
            loader: EditFile.loader(context),
          },
        ],
      },
    ],
  },
]

function ErrorModal() {
  const error = RR.useRouteError() as Error
  const navigate = RR.useNavigate()
  return (
    <MR.Modal onClose={() => navigate(-1)}>
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
    </MR.Modal>
  )
}
