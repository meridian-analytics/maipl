import * as R from "react"
import * as RR from "react-router-dom"
import * as M from "@mui/material"
import Grid from "@mui/material/Unstable_Grid2"
import * as Z from "zod"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as I from "@mui/icons-material"
import type { LoaderData } from "./types"
import { AnnotateBatchSegmentQuery } from "./queries"
import { Provider } from "./providers"
import { VisualizationTool } from "./components/VisualizationTool"
import { SegmentList } from "./components/SegmentList"
import { ShortcutsMenu } from "./components/ShortcutsMenu"
import { CopyButton } from "./buttons/CopyButton"
import { DeleteButton } from "./buttons/DeleteButton"
import { PasteButton } from "./buttons/PasteButton"
import { PasteConfigButton } from "./buttons/PasteConfigButton"
import { RedoButton } from "./buttons/RedoButton"
import { UndoButton } from "./buttons/UndoButton"
import { SaveButton } from "./buttons/SaveButton"
import * as CopyPasteContext from "../../CopyPasteContext"
import AnnotationFilters from "../../AnnotationFilters"
import AnnotationList from "../../AnnotationList"
import AnnotationForm from "../../AnnotationForm"
import ToolPalette from "../../ToolPalette"
import AudioControls from "../../AudioControls"
import { LoadingState } from "./components/LoadingState"

export const loader = (maipl: MR.t_context, queryClient: RQ.QueryClient) =>
  (async ({ request, params }): Promise<LoaderData> => {
    // If user data is not available, return null to trigger loading state
    if (maipl.user == null) {
      return null
    }

    const batchId = Z.coerce.number().parse(params["batchId"])
    const segmentId = Z.coerce.number().parse(params["segmentId"])
    const query = AnnotateBatchSegmentQuery(maipl, batchId, segmentId)
    return queryClient.ensureQueryData(query)
  }) satisfies RR.LoaderFunction

export function Component() {
  const loaderData = RR.useLoaderData() as LoaderData | null
  const panelStyle: M.SxProps = { height: "40vh", overflow: "auto" }
  const [showFilters, setShowFilters] = R.useState(false)

  // Show loading state while data is not available
  if (loaderData == null) {
    return <LoadingState />
  }

  return (
    <Provider>
      <Grid
        container
        sx={{
          maxHeight: "100%",
          overflow: "hidden",
        }}
      >
        <Grid xs={12}>
          <M.Stack direction="row" spacing={2}>
            <M.Typography variant="h5">
              {loaderData.batch.batch_name}
            </M.Typography>
            <M.Stack flexGrow={5} />

            {/* View & Navigation Group */}
            <M.Stack direction="row" spacing={1}>
              <ShortcutsMenu />
              <ToolPalette direction="row" />
              <AudioControls direction="row" />
            </M.Stack>
            <M.Divider orientation="vertical" flexItem />

            {/* Annotation Management Group */}
            <M.Stack direction="row" spacing={1}>
              <CopyPasteContext.Provider>
                <CopyButton />
                <PasteButton />
                <PasteConfigButton />
                <DeleteButton />
                <MR.Menu icon={<I.HelpOutline />} title="Copy & Paste Help">
                  <M.MenuItem>
                    <M.Typography variant="subtitle2" color="primary">
                      Copy & Paste Functions
                    </M.Typography>
                  </M.MenuItem>
                  <M.Divider />
                  <M.MenuItem>
                    <M.Stack spacing={1}>
                      <M.Typography variant="body2">
                        <I.ContentCopy sx={{ fontSize: 16, mr: 1 }} />
                        Copy Properties
                      </M.Typography>
                      <M.Typography variant="caption" color="text.secondary">
                        Copy selected annotation properties for reuse
                      </M.Typography>
                    </M.Stack>
                  </M.MenuItem>
                  <M.MenuItem>
                    <M.Stack spacing={1}>
                      <M.Typography variant="body2">
                        <I.ContentPaste sx={{ fontSize: 16, mr: 1 }} />
                        Paste Properties
                      </M.Typography>
                      <M.Typography variant="caption" color="text.secondary">
                        Apply copied properties to selected annotations
                      </M.Typography>
                    </M.Stack>
                  </M.MenuItem>
                  <M.MenuItem>
                    <M.Stack spacing={1}>
                      <M.Typography variant="body2">
                        <I.Checklist sx={{ fontSize: 16, mr: 1 }} />
                        Paste Configuration
                      </M.Typography>
                      <M.Typography variant="caption" color="text.secondary">
                        Choose which properties to include when pasting
                      </M.Typography>
                    </M.Stack>
                  </M.MenuItem>
                  <M.MenuItem>
                    <M.Stack spacing={1}>
                      <M.Typography variant="body2">
                        <I.Backspace sx={{ fontSize: 16, mr: 1 }} />
                        Delete
                      </M.Typography>
                      <M.Typography variant="caption" color="text.secondary">
                        Remove selected annotations
                      </M.Typography>
                    </M.Stack>
                  </M.MenuItem>
                </MR.Menu>
              </CopyPasteContext.Provider>
            </M.Stack>
            <M.Divider orientation="vertical" flexItem />

            {/* History & Save Group */}
            <M.Stack direction="row" spacing={1}>
              <UndoButton />
              <RedoButton />
              <SaveButton />
            </M.Stack>
          </M.Stack>
        </Grid>
        <Grid xs={12}>
          <VisualizationTool />
        </Grid>
        <Grid xs={4}>
          <SegmentList sx={panelStyle} />
        </Grid>
        <Grid xs={4}>
          {showFilters ? (
            <AnnotationFilters
              setShowFilters={setShowFilters}
              sx={panelStyle}
            />
          ) : (
            <AnnotationList setShowFilters={setShowFilters} sx={panelStyle} />
          )}
        </Grid>
        <Grid xs={4}>
          <AnnotationForm sx={panelStyle} />
        </Grid>
      </Grid>
    </Provider>
  )
}

export default Component
