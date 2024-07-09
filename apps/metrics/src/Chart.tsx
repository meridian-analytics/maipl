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

const MetricsChart = ({ data, xs }) => {
  console.log(data)
  const [selectedMetrics, setSelectedMetrics] = useState([
    "Precision",
    "Recall",
    "F1-Score",
  ])
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
            label: `${metric} - Class ${d.class} - File ${fileId}`,
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
      <div>
        {fileIds.map((id) => (
          <label key={id}>
            <input
              type='checkbox'
              checked={selectedFileIds.includes(id)}
              onChange={() => {
                setSelectedFileIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((f) => f !== id)
                    : [...prev, id]
                )
              }}
            />
            File {id}
          </label>
        ))}
        {metrics.map((metric) => (
          <label key={metric}>
            <input
              type='checkbox'
              checked={selectedMetrics.includes(metric)}
              onChange={() => {
                setSelectedMetrics((prev) =>
                  prev.includes(metric)
                    ? prev.filter((m) => m !== metric)
                    : [...prev, metric]
                )
              }}
            />
            {metric}
          </label>
        ))}
        {classes.map((cls) => (
          <label key={cls} style={{ color: colorMap[cls] }}>
            <input
              type='checkbox'
              checked={selectedClasses.includes(cls)}
              onChange={() => {
                setSelectedClasses((prev) =>
                  prev.includes(cls)
                    ? prev.filter((c) => c !== cls)
                    : [...prev, cls]
                )
              }}
            />
            Class {cls}
          </label>
        ))}
      </div>
      <div
        style={{
          width: "100%",
          height: "calc(100% - 50px)",
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
    </M.Grid>
  )
}

export default MetricsChart
