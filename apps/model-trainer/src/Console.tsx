import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import * as M from "@mui/material"
import { TrainerTask } from "@maipl/api"
import RefreshIcon from "@mui/icons-material/Refresh"
import CloseIcon from "@mui/icons-material/Close"
import * as R from "react"

export default function ConsoleLoader() {
  const navigate = RR.useNavigate()
  const maipl = MR.useMaipl()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params["taskId"], null)

  const onClose = () => {
    navigate(-1)
  }

  const { data, error, isLoading, refetch } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["trainer-tasks-console", taskId],
    queryFn: () => {
      return TrainerTask.get_console(maipl.client, taskId!)
    },
  })

  return (
    <Console
      consoleOutput={data["console_output"] || ""}
      onClose={onClose}
      onRefresh={refetch}
      isLoading={isLoading}
      error={error}
    />
  )
}

function Console(props: {
  consoleOutput: string
  onClose: () => void
  onRefresh: () => void
  isLoading: boolean
  error: Error | null
}) {
  const consoleRef = R.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }

  R.useEffect(() => {
    scrollToBottom()
  }, [props.consoleOutput])

  R.useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100)
    return () => clearTimeout(timer)
  }, [props.consoleOutput])

  R.useEffect(() => {
    const interval = setInterval(() => {
      props.onRefresh()
    }, 2000)
    return () => clearInterval(interval)
  }, [props.onRefresh])

  return (
    <MR.Modal onClose={props.onClose} sx={{ minWidth: 800, height: "80vh" }}>
      {props.isLoading && <M.CircularProgress />}
      {props.error && <M.Alert severity="error">{props.error.message}</M.Alert>}
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
        <M.Box
          ref={consoleRef}
          sx={{
            flexGrow: 1,
            overflow: "auto",
            bgcolor: "#000",
            color: "#fff",
            p: 2,
            maxHeight: "calc(80vh - 120px)",
          }}
        >
          <M.Typography
            component="pre"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "monospace",
              m: 0,
              fontSize: "12px",
            }}
          >
            {props.consoleOutput}
          </M.Typography>
        </M.Box>
      </M.Stack>
    </MR.Modal>
  )
}
