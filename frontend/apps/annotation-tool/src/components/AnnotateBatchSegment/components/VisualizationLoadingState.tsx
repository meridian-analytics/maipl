import * as M from "@mui/material"

export function VisualizationLoadingState() {
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
          <M.Skeleton variant="rectangular" height={300} />
        </div>
      </div>
    </M.Paper>
  )
}
