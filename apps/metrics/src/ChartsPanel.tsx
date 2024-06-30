import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"
import * as RQ from "@tanstack/react-query"
import * as MR from "@maipl/react"
import { Metrics } from "@maipl/api"
import Chart from "./Chart"

const buttonStyle = {
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
}

const yAxises = [
  { value: "Precision", label: "Precision" },
  { value: "Recall", label: "Recall" },
  { value: "F1-Score", label: "F1-Score" },
]

const ChartsPanel = ({ selection, isFullWidth, setIsFullWidth }) => {
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()
  const maipl = MR.useMaipl()

  const selectedIds = R.useMemo(() => {
    return [...selection.keys()]
  }, [selection])

  const [metrics, setMetrics] = R.useState([])
  const [yAxis, setYAxis] = R.useState("F1-Score")
  const [chartsPerRow, setChartsPerRow] = R.useState(1)
  const [tip, setTip] = R.useState(false)

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Metrics.files>) => {
      return Metrics.files(...vars)
    },
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity='error'>
          Error: Could not process metrics
        </M.Alert>
      ))
    },
    onSettled: () => {
      createMutation.reset()
    },
    onSuccess: (data) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity='success'>
          Success: Processed metrics
        </M.Alert>
      ))
      setMetrics(data)
    },
  })

  R.useEffect(() => {
    if (selectedIds && selectedIds.length > 0) {
      createMutation.mutateAsync([maipl.client, selectedIds])
    }
  }, [selectedIds])

  const ToolArea = () => {
    return (
      <M.Stack direction='row' id='tool-area'>
        <M.FormControl>
          <M.InputLabel id='y-axis-select-label'>Y-Axis</M.InputLabel>
          <M.Select
            labelId='y-axis-select-label'
            id='y-axis'
            label='Y-Axis'
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value)}
            sx={{ minWidth: "100px" }}
          >
            {yAxises.map((yAxis) => (
              <M.MenuItem key={yAxis.value} value={yAxis.value}>
                {yAxis.value}
              </M.MenuItem>
            ))}
          </M.Select>
        </M.FormControl>
        {/* Number Select Menu for Charts Per Row */}
        <M.FormControl>
          <M.InputLabel id='charts-per-row-label'>Charts Per Row</M.InputLabel>
          <M.Select
            labelId='charts-per-row-label'
            id='charts-per-row'
            label='Charts Per Row'
            value={chartsPerRow}
            onChange={(e) => setChartsPerRow(e.target.value)}
            sx={{ minWidth: "120px" }}
          >
            {[1, 2, 3, 4].map((number) => (
              <M.MenuItem key={number} value={number}>
                {number}
              </M.MenuItem>
            ))}
          </M.Select>
        </M.FormControl>
        {/* Switch for Tip State */}
        <M.FormControl component='fieldset'>
          <M.FormGroup aria-label='tip' row>
            <M.FormControlLabel
              control={
                <M.Switch
                  checked={tip}
                  onChange={(e) => setTip(e.target.checked)}
                  name='tipSwitch'
                />
              }
              label='Enable Tip'
            />
          </M.FormGroup>
        </M.FormControl>
      </M.Stack>
    )
  }

  return (
    <M.Stack
      id='charts-container'
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        paddingRight: 2,
        paddingBottom: 2,
        paddingLeft: isFullWidth ? 2 : 0,
      }}
    >
      <ToolArea />
      <M.Grid
        container
        component={M.Paper}
        id='charts'
        sx={{
          width: "100%",
          height: "100%",
          overflow: "auto",
        }}
      >
        {metrics.length !== 0 &&
          selectedIds.map((id) => {
            const gridSize = Math.floor(12 / chartsPerRow)
            return (
              <Chart
                key={id}
                data={metrics[id]}
                file={selection.get(id)}
                yAxis={yAxis}
                tip={tip}
                xs={gridSize}
              />
            )
          })}
      </M.Grid>
      <M.Button onClick={() => setIsFullWidth(!isFullWidth)} sx={buttonStyle}>
        {isFullWidth ? ">" : "<"}
      </M.Button>
    </M.Stack>
  )
}

export default ChartsPanel
