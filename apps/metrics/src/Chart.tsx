import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"
import * as Plot from "@observablehq/plot"
import { filesize } from "@maipl/format"

const Chart = ({ data, file, yAxis, tip, grid, ...props }) => {
  const { path, basename } = file

  const containerRef = R.useRef()

  const [colors, setColors] = R.useState([])

  R.useEffect(() => {
    if (data) {
      const newColors = data.map(getRandomColor)
      setColors(newColors)
    }
  }, [data])

  R.useEffect(() => {
    if (containerRef.current && data) {
      const plot = createPlot(data, file, yAxis, tip, grid, colors)
      if (plot) {
        containerRef.current.appendChild(plot)

        return () => {
          if (containerRef.current && containerRef.current.contains(plot)) {
            containerRef.current.removeChild(plot)
          }
        }
      }
    }
  }, [data, yAxis, tip, grid, colors])

  return <M.Grid item ref={containerRef} xs={props.xs} />
}

function getRandomColor() {
  const letters = "0123456789ABCDEF"
  let color = "#"
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

function createPlot(data, file, yAxis, tip, grid, colors) {
  const labels = data.map((item) => item["class"])

  return Plot.plot({
    width: 800,
    height: 600,
    subtitle: `File: ${file.path}`,
    caption: `This plot visualizes how ${yAxis} vary with different threshold settings.`,
    x: { label: "Threshold" },
    y: { label: yAxis },
    color: {
      domain: labels,
      range: colors,
      legend: true,
    },
    grid: grid,
    marks: [
      data.map((item, index) =>
        Plot.lineY(item["metrics"], {
          x: "threshold",
          y: yAxis,
          stroke: colors[index],
          tip: tip,
        })
      ),
    ],
  })
}

export default Chart
