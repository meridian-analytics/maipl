import * as M from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import CloseIcon from "@mui/icons-material/Close"
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function Log(props: {
  data: {
    labels: number[]
    datasets: {
      label: string
      data: number[]
      borderColor: string
      tension: number
    }[]
  }
  onClose: () => void
  onRefresh: () => void
}) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Training Metrics",
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Epoch" },
      },
      y: {
        title: { display: true, text: "Metric Value" },
      },
    },
  }

  return (
    <M.Modal onClose={props.onClose} sx={{ minWidth: 800, height: "80vh" }}>
      <M.Stack sx={{ height: "100%", overflow: "hidden" }}>
        <M.Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            p: 1,
            borderBottom: "1px solid #ccc",
          }}
        >
          <M.IconButton onClick={props.onRefresh} sx={{ mr: 1 }}>
            <RefreshIcon />
          </M.IconButton>
          <M.IconButton onClick={props.onClose}>
            <CloseIcon />
          </M.IconButton>
        </M.Box>
        <M.Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
          <Line options={options} data={props.data} />
        </M.Box>
      </M.Stack>
    </M.Modal>
  )
} 