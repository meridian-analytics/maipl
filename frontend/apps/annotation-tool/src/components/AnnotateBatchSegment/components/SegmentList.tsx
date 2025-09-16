import * as R from "react"
import * as RR from "react-router-dom"
import * as M from "@mui/material"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import type { LoaderData } from "../types"
import { useSaveContext } from "../../../SaveContext"

const COLUMN_STYLES = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 120px 120px",
    gap: 0,
    width: "100%",
    minHeight: "40px",
  },
  cell: {
    px: 2,
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
  divider: {
    borderLeft: 1,
    borderColor: "divider",
  },
}

export function SegmentList(props: { sx?: M.SxProps }) {
  const loaderData = RR.useLoaderData() as LoaderData
  const { hasUnsavedChanges } = useSaveContext()
  const navigate = RR.useNavigate()
  const [showConfirmDialog, setShowConfirmDialog] = R.useState(false)
  const [pendingNavigation, setPendingNavigation] = R.useState<string | null>(
    null
  )

  const handleSegmentClick = (segmentId: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(segmentId)
      setShowConfirmDialog(true)
    } else {
      navigate(`/annotate/${loaderData.batch.id}/segment/${segmentId}`)
    }
  }

  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      navigate(`/annotate/${loaderData.batch.id}/segment/${pendingNavigation}`)
      setPendingNavigation(null)
    }
    setShowConfirmDialog(false)
  }

  const handleCancelNavigation = () => {
    setPendingNavigation(null)
    setShowConfirmDialog(false)
  }

  return (
    <>
      <MR.Panel
        title={`Segments (${loaderData.segments.length})`}
        sx={{
          ...props.sx,
          "& .MuiPanel-title": {
            fontWeight: 700,
            color: "text.primary",
          },
        }}
        contents={
          <>
            <M.Box
              sx={{
                ...COLUMN_STYLES.container,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <M.Typography variant="subtitle2" sx={COLUMN_STYLES.cell}>
                Filename
              </M.Typography>
              <M.Typography
                variant="subtitle2"
                sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
              >
                Start
              </M.Typography>
              <M.Typography
                variant="subtitle2"
                sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
              >
                End
              </M.Typography>
            </M.Box>
            <M.List disablePadding>
              {loaderData.segments.map((s) => (
                <M.ListItem disablePadding key={s.id}>
                  <M.ListItemButton
                    onClick={() => handleSegmentClick(s.id)}
                    selected={s.id == loaderData.active.segment.id}
                    sx={{
                      ...COLUMN_STYLES.container,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                      "&.Mui-selected": {
                        bgcolor: "action.selected",
                      },
                      padding: 0,
                      borderRadius: 0,
                    }}
                  >
                    <M.Tooltip title={s.filename} placement="top">
                      <M.Typography
                        variant="body2"
                        sx={{
                          ...COLUMN_STYLES.cell,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.filename}
                      </M.Typography>
                    </M.Tooltip>
                    <M.Tooltip
                      title={
                        typeof s.start === "number" ? s.start.toFixed(3) : "-"
                      }
                      placement="top"
                    >
                      <M.Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
                      >
                        {typeof s.start === "number" ? s.start.toFixed(3) : "-"}
                      </M.Typography>
                    </M.Tooltip>
                    <M.Tooltip
                      title={typeof s.end === "number" ? s.end.toFixed(3) : "-"}
                      placement="top"
                    >
                      <M.Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
                      >
                        {typeof s.end === "number" ? s.end.toFixed(3) : "-"}
                      </M.Typography>
                    </M.Tooltip>
                  </M.ListItemButton>
                </M.ListItem>
              ))}
            </M.List>
          </>
        }
      />

      <M.Dialog
        open={showConfirmDialog}
        onClose={handleCancelNavigation}
        aria-labelledby="unsaved-changes-dialog-title"
        aria-describedby="unsaved-changes-dialog-description"
      >
        <M.DialogTitle id="unsaved-changes-dialog-title">
          Unsaved Changes
        </M.DialogTitle>
        <M.DialogContent>
          <M.DialogContentText id="unsaved-changes-dialog-description">
            You have unsaved changes. Are you sure you want to leave without
            saving?
          </M.DialogContentText>
        </M.DialogContent>
        <M.DialogActions>
          <M.Button onClick={handleCancelNavigation} color="primary">
            Stay Here
          </M.Button>
          <M.Button onClick={handleConfirmNavigation} color="error" autoFocus>
            Leave Without Saving
          </M.Button>
        </M.DialogActions>
      </M.Dialog>
    </>
  )
}
