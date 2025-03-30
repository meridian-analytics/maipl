import * as M from "@mui/material"
import * as RR from "react-router-dom"
import * as R from "react"

export function VisualizationLoadingState() {
  const navigation = RR.useNavigation()
  const isNavigating = navigation.state === "loading"
  const [progress, setProgress] = R.useState(0)
  const [stage, setStage] = R.useState("Loading...")

  // Listen for loading progress events
  R.useEffect(() => {
    const handleProgress = (
      event: CustomEvent<{ stage: string; progress: number }>
    ) => {
      const { stage, progress } = event.detail
      setStage(stage)
      setProgress(progress)
    }

    window.addEventListener("loading-progress", handleProgress as EventListener)
    return () => {
      window.removeEventListener(
        "loading-progress",
        handleProgress as EventListener
      )
    }
  }, [])

  // Reset progress when navigation starts
  R.useEffect(() => {
    if (isNavigating) {
      setProgress(0)
      setStage("Loading...")
    }
  }, [isNavigating])

  return (
    <M.Paper
      sx={{
        margin: "0 auto",
        overflow: "hidden",
        padding: "1rem",
        resize: "horizontal",
      }}
    >
      <div
        style={{
          display: "grid",
          gridGap: "1rem",
          gridTemplateColumns: "80px 1fr",
          gridTemplateRows: "40px 300px 20px",
          gridTemplateAreas: `
            ". nav"
            "y spec"
            ". x"
          `,
        }}
      >
        <div style={{ gridArea: "nav" }}>
          <M.Skeleton variant="rectangular" height={40} />
        </div>
        <div style={{ gridArea: "x", overflow: "hidden" }}>
          <M.Skeleton variant="rectangular" height={20} />
        </div>
        <div style={{ gridArea: "y", overflow: "hidden" }}>
          <M.Skeleton variant="rectangular" width={80} height={300} />
        </div>
        <div style={{ gridArea: "spec" }}>
          <M.Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              width: "100%",
              px: 4,
            }}
          >
            <M.CircularProgress size={60} />
            <M.Typography variant="h6" color="text.secondary">
              {stage}
            </M.Typography>
            <M.Box sx={{ width: "50%", mt: 2 }}>
              <M.LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: M.colors.grey[200],
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                  },
                }}
              />
              <M.Typography
                variant="caption"
                color="text.secondary"
                align="center"
                sx={{ display: "block", mt: 1 }}
              >
                {Math.round(progress)}%
              </M.Typography>
            </M.Box>
          </M.Box>
        </div>
      </div>
    </M.Paper>
  )
}
