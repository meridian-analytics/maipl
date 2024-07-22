import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"
import * as RQ from "@tanstack/react-query"
import * as MR from "@maipl/react"
import { Metrics } from "@maipl/api"
import Chart from "./Chart"

const SingleChartIcon = (props) => (
  <M.SvgIcon {...props}>
    <rect width='20' height='20' x='2' y='2' rx='2' ry='2' />
  </M.SvgIcon>
)

const SideBySideChartIcon = (props) => (
  <M.SvgIcon {...props}>
    <rect x='1' y='2' width='9' height='20' rx='2' ry='2' />
    <rect x='14' y='2' width='9' height='20' rx='2' ry='2' />
  </M.SvgIcon>
)


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

  const [metrics, setMetrics] = R.useState({})
  const [chartsPerRow, setChartsPerRow] = R.useState(1)

  const filesMutation = RQ.useMutation({
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
      filesMutation.reset()
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
    if (selection.size > 0) {
      const selectedIds = [...selection.keys()]
      console.log(selectedIds)
      filesMutation.mutateAsync([maipl.client, selectedIds])
    } else {
      setMetrics({})
    }
  }, [selection])

  const ToolArea = () => {
    return (
      <M.Stack
        direction='row'
        id='tool-area'
        spacing={2}
        sx={{ paddingTop: 1, width: "100%", justifyContent: "center" }}
      >
        <M.FormControl>
          <M.ButtonGroup variant='contained' aria-label='charts per row'>
            {[1, 2].map((number) => (
              <M.IconButton
                key={number}
                onClick={() => setChartsPerRow(number)}
                color={chartsPerRow === number ? "primary" : "default"}
                aria-label={`${number} charts per row`}
                disabled={selection.size === 0}
              >
                {number === 1 && (
                  <M.Tooltip title='Single Chart View'>
                    <SingleChartIcon fontSize='medium' />
                  </M.Tooltip>
                )}
                {number === 2 && (
                  <M.Tooltip title='Side-by-Side Charts View'>
                    <SideBySideChartIcon fontSize='medium' />
                  </M.Tooltip>
                )}
              </M.IconButton>
            ))}
          </M.ButtonGroup>
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
        {Object.keys(metrics).length !== 0 &&
          Array.from({ length: chartsPerRow }).map((_, index) => {
            const gridSize = Math.floor(12 / chartsPerRow)
            return (
              <Chart
                key={index}
                data={metrics}
                files={selection}
                xs={gridSize}
                isFullWidth={isFullWidth}
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
