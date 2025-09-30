import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import * as R from "react"
import * as AnnotateBatch from "./AnnotateBatch"
import * as AnnotateBatchSegment from "./components/AnnotateBatchSegment"
import Batches from "./Batches"
import NewBatch from "./NewBatch"
import * as ShowBatch from "./ShowBatch"
import { SaveProvider } from "./SaveContext"

export default function App() {
  return (
    <SaveProvider>
      <MR.MaiplProvider
        router={router}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      />
    </SaveProvider>
  )
}

function Layout() {
  return (
    <>
      <MR.Notifications />
      <M.Stack
        sx={{
          backgroundColor: M.colors.grey[50],
          height: "100vh",
          maxHeight: "100vh",
        }}
      >
        <MR.Navbar>
          <LocalNavigation />
        </MR.Navbar>
        <RR.Outlet />
      </M.Stack>
    </>
  )
}

function LocalNavigation() {
  const batchId = RR.useMatch("/annotate/:batchId/*")?.params?.batchId
  const tab = RR.useMatch("/:tab/*")?.params?.tab
  const navigate = RR.useNavigate()
  const [showConfirmDialog, setShowConfirmDialog] = R.useState(false)
  
  const isInAnnotateTab = tab === "annotate"
  
  const handleBatchesClick = (event: React.MouseEvent) => {
    if (isInAnnotateTab) {
      event.preventDefault()
      setShowConfirmDialog(true)
    }
    // If not in annotate tab, let the default Link behavior work
  }
  
  const handleConfirmSwitch = () => {
    setShowConfirmDialog(false)
    navigate("/batches")
  }
  
  const handleCancelSwitch = () => {
    setShowConfirmDialog(false)
  }
  
  return (
    <>
      <M.Stack direction="row" flexGrow={1} justifyContent="center">
        <M.Tabs value={tab ?? "batches"} indicatorColor="primary">
          <M.Tab
            component={RR.Link}
            label="Batches"
            to="/batches"
            value="batches"
            onClick={handleBatchesClick}
          />
          <M.Tab
            component={RR.Link}
            disabled={batchId == null}
            label="Annotate"
            to={`/annotate/${batchId}`}
            value="annotate"
          />
        </M.Tabs>
      </M.Stack>
      
      <M.Dialog
        open={showConfirmDialog}
        onClose={handleCancelSwitch}
        aria-labelledby="switch-tab-dialog-title"
        aria-describedby="switch-tab-dialog-description"
      >
        <M.DialogTitle id="switch-tab-dialog-title">
          Switch to Batches?
        </M.DialogTitle>
        <M.DialogContent>
          <M.DialogContentText id="switch-tab-dialog-description">
            Switching to Batches will reset your current annotation view. 
            You'll need to navigate back to continue where you left off.
          </M.DialogContentText>
        </M.DialogContent>
        <M.DialogActions>
          <M.Button onClick={handleCancelSwitch} color="primary">
            Stay in Annotate
          </M.Button>
          <M.Button onClick={handleConfirmSwitch} color="primary" variant="contained">
            Switch to Batches
          </M.Button>
        </M.DialogActions>
      </M.Dialog>
    </>
  )
}

const router: MR.t_router = (context, queryClient) => [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <RR.Navigate to="/batches" replace />,
      },
      {
        path: "batches",
        element: <Batches />,
        children: [
          {
            path: "new",
            element: <NewBatch />,
          },
          {
            path: ":batchId",
            element: <ShowBatch.Element />,
            errorElement: <MR.ErrorModal />,
            loader: ShowBatch.loader(context),
          },
        ],
      },
      {
        path: "annotate/:batchId",
        loader: AnnotateBatch.loader(context),
      },
      {
        path: "annotate/:batchId/segment/:segmentId",
        loader: AnnotateBatchSegment.loader(context, queryClient),
        Component: AnnotateBatchSegment.Component,
      },
    ],
  },
]
