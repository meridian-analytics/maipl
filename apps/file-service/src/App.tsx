import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import { EditFile, NewFile } from "./FileEditor"
import * as FileShare from "./FileShare"
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
        errorElement: <MR.ErrorModal />,
        loader: Files.loader(context),
        children: [
          {
            path: "share",
            element: FileShare.element,
            errorElement: <MR.ErrorModal />,
            loader: FileShare.loader(context),
          },
          {
            path: "upload",
            element: FileUpload.element,
            errorElement: <MR.ErrorModal />,
            loader: FileUpload.loader(context),
          },
          {
            path: "new",
            element: NewFile.element,
            errorElement: <MR.ErrorModal />,
            loader: NewFile.loader(context),
          },
          {
            path: ":fileId/edit",
            element: EditFile.element,
            errorElement: <MR.ErrorModal />,
            loader: EditFile.loader(context),
          },
        ],
      },
    ],
  },
]
