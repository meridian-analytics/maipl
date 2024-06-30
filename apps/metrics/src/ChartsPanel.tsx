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
  const [grid, setGrid] = R.useState(false)
  const [mode, setMode] = R.useState("separated")

  const handleModeChange = (event) => {
    setMode(event.target.checked ? "combined" : "separated")
  }

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

  R.useEffect(()=>{
    if(mode === "combined"){
      combinedData = reduceMetrics()
    }
  },[mode])

  const reduceMetrics = () => {
    combinedData = []
    selectedIds.forEach((id) => {
      const new_class = `${selection.get(id).path}-${metrics[id]["class"]}`
      combinedData.push({ new_class, metrics })
    })
  }

  const ToolArea = () => {
    return (
      <M.Stack direction='row' id='tool-area' spacing={2}>
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
        <M.FormControl>
          <M.ButtonGroup variant='contained' aria-label='charts per row'>
            {[1, 2, 3, 4].map((number) => (
              <M.IconButton
                key={number}
                onClick={() => setChartsPerRow(number)}
                color={chartsPerRow === number ? "primary" : "default"}
                aria-label={`${number} charts per row`}
                disabled={selectedIds.length < number}
              >
                {number === 1 && <M.Icon>1</M.Icon>}
                {number === 2 && <M.Icon>2</M.Icon>}
                {number === 3 && <M.Icon>3</M.Icon>}
                {number === 4 && <M.Icon>4</M.Icon>}
              </M.IconButton>
            ))}
          </M.ButtonGroup>
        </M.FormControl>
        <M.FormControl component='fieldset'>
          <M.FormGroup aria-label='settings' row>
            <M.FormControlLabel
              control={
                <M.Switch
                  checked={tip}
                  onChange={(e) => setTip(e.target.checked)}
                  name='tipSwitch'
                />
              }
              label='Tip'
            />
            <M.FormControlLabel
              control={
                <M.Switch
                  checked={grid}
                  onChange={(e) => setGrid(e.target.checked)}
                  name='gridSwitch'
                />
              }
              label='Grid'
            />
            <M.FormControlLabel
              control={
                <M.Switch
                  checked={mode === "combined"}
                  onChange={handleModeChange}
                  name='modeSwitch'
                />
              }
              label={mode === "combined" ? "Combined" : "Separated"}
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
                grid={grid}
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
