import React, { useState } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import * as M from "@mui/material"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const MetricsChart = ({ data, xs, files }) => {
  const [selectedMetrics, setSelectedMetrics] = useState(["F1-Score"])
  const [selectedFileIds, setSelectedFileIds] = useState([Object.keys(data)[0]])
  const [selectedClasses, setSelectedClasses] = useState([])

  const metrics = ["Precision", "Recall", "F1-Score"]
  const fileIds = Object.keys(data)
  const classes = [
    ...new Set(
      Object.values(data).flatMap((fileData) => fileData.map((d) => d.class))
    ),
  ]

  const colorMap = {}
  classes.forEach((cls, index) => {
    colorMap[cls] = `hsl(${(index * 360) / classes.length}, 70%, 50%)`
  })

  const chartData = {
    labels: data[fileIds[0]][0].metrics.map((m) => m.threshold),
    datasets: selectedFileIds.flatMap((fileId) =>
      data[fileId]
        .filter(
          (d) =>
            selectedClasses.length === 0 || selectedClasses.includes(d.class)
        )
        .flatMap((d) =>
          selectedMetrics.map((metric) => ({
            label: `${metric} - Class ${d.class} - ${
              files.get(parseInt(fileId)).tag
            }`,
            data: d.metrics.map((m) => m[metric]),
            borderColor: colorMap[d.class],
            borderDash:
              metric === "Precision"
                ? []
                : metric === "Recall"
                ? [5, 5]
                : [2, 2],
            fill: false,
          }))
        )
    ),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Metrics vs Threshold (Multiple Files)" },
    },
    scales: {
      x: { title: { display: true, text: "Threshold" } },
      y: {
        title: { display: true, text: "Metric Value" },
        min: 0,
        max: 1,
      },
    },
  }

  return (
    <M.Grid
      item
      sx={{
        padding: 2,
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
      xs={xs}
    >
      <div
        style={{
          width: "100%",
          height: "calc(100% - 100px)",
          position: "relative",
        }}
      >
        <Line
          data={chartData}
          options={options}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      </div>
      <M.Grid container spacing={2} sx={{ mt: 2 }}>
        <M.Grid item xs={4}>
          <M.FormControl fullWidth>
            <M.InputLabel>Files</M.InputLabel>
            <M.Select
              label='Model'
              multiple
              value={selectedFileIds}
              onChange={(e) => setSelectedFileIds(e.target.value)}
              renderValue={(selected) =>
                selected.map((id) => files.get(parseInt(id)).tag).join(", ")
              }
            >
              {fileIds.map((id) => (
                <M.MenuItem key={id} value={id}>
                  <M.Checkbox checked={selectedFileIds.includes(id)} />
                  <M.ListItemText primary={files.get(parseInt(id)).tag} />
                </M.MenuItem>
              ))}
            </M.Select>
          </M.FormControl>
        </M.Grid>
        <M.Grid item xs={4}>
          <M.FormControl fullWidth>
            <M.InputLabel>Metrics</M.InputLabel>
            <M.Select
              label='Model'
              multiple
              value={selectedMetrics}
              onChange={(e) => setSelectedMetrics(e.target.value)}
              renderValue={(selected) => selected.join(", ")}
            >
              {metrics.map((metric) => (
                <M.MenuItem key={metric} value={metric}>
                  <M.Checkbox checked={selectedMetrics.includes(metric)} />
                  <M.ListItemText primary={metric} />
                </M.MenuItem>
              ))}
            </M.Select>
          </M.FormControl>
        </M.Grid>
        <M.Grid item xs={4}>
          <M.FormControl fullWidth>
            <M.InputLabel>Classes</M.InputLabel>
            <M.Select
              label='Model'
              multiple
              value={selectedClasses}
              onChange={(e) => setSelectedClasses(e.target.value)}
              renderValue={(selected) => selected.join(", ")}
            >
              {classes.map((cls) => (
                <M.MenuItem key={cls} value={cls}>
                  <M.Checkbox checked={selectedClasses.includes(cls)} />
                  <M.ListItemText primary={`Class ${cls}`} />
                </M.MenuItem>
              ))}
            </M.Select>
          </M.FormControl>
        </M.Grid>
      </M.Grid>
    </M.Grid>
  )
}

export default MetricsChart
