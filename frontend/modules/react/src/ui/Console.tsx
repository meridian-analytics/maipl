import * as M from "@mui/material"
import * as R from "react"

export default function Console(props: {
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
    <M.Modal onClose={props.onClose} sx={{ minWidth: 800, height: "80vh" }}>
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
    </M.Modal>
  )
}
