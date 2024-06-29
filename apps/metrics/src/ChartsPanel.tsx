import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"

interface Metric {
  threshold: number
  Precision: number
  Recall: number
  "F1-Score": number
  FPR_per_time_unit: number
}

interface ClassMetric {
  class: string
  metrics: Metric[]
}

interface ChartsPanelProps {
  data: {
    [key: string]: ClassMetric[]
  }
}
const ChartsPanel: React.FC<ChartsPanelProps> = ({
  data,
  selection,
  isFullWidth,
  setIsFullWidth,
}) => {
  return (
    <M.Paper
      id='charts'
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <M.Button
        onClick={() => setIsFullWidth(!isFullWidth)}
        sx={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)",
          minWidth: "5px",
          minHeight: "70px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backgroundColor: "transparent",
          color: "text.primary",
          "&:hover": {
            backgroundColor: "primary.main",
            color: "primary.contrastText",
          },
          boxShadow: 1,
          borderRadius: "0",
          borderTopRightRadius: "8px",
          borderBottomRightRadius: "8px",
          borderColor: "rgba(0, 0, 0, 0.05)",
          padding: "0 4px",
          fontWeight: "bold",
        }}
      >
        {isFullWidth ? ">" : "<"}
      </M.Button>
    </M.Paper>
  )
}

export default ChartsPanel
