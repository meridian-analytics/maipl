import * as M from "@mui/material"
import * as R from "react"
import * as I from "@mui/icons-material"
import * as MR from "@maipl/react"

export default function Terminal(props: {
  consoleOutput: string
  onClose: () => void
  onRefresh: () => void
  isLoading: boolean
  error: Error | null
}) {
  const consoleRef = R.useRef<HTMLDivElement>(null)
  const [countdown, setCountdown] = R.useState(5)

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
      setCountdown(5)
    }, 5000)

    const countdownInterval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(countdownInterval)
    }
  }, [props.onRefresh])

  return (
    <MR.Modal
      open={true}
      onClose={props.onClose}
      sx={{ minWidth: 800, height: "80vh" }}
    >
      <M.Stack sx={{ height: "100%", overflow: "hidden", position: "relative" }}>
        <M.Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            p: 1,
            borderBottom: "1px solid #ccc",
          }}
        >
          <M.IconButton onClick={props.onRefresh} sx={{ mr: 1 }}>
            <I.Refresh />
          </M.IconButton>
          <M.IconButton onClick={props.onClose}>
            <I.Close />
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {props.isLoading ? (
            <M.Stack alignItems="center" spacing={2}>
              <M.CircularProgress sx={{ color: "#fff" }} />
              <M.Typography sx={{ color: "#fff" }}>Loading console output...</M.Typography>
            </M.Stack>
          ) : props.error ? (
            <M.Alert 
              severity="error" 
              sx={{ 
                width: "100%",
                bgcolor: "rgba(211, 47, 47, 0.1)",
                color: "#fff"
              }}
            >
              {props.error.message}
            </M.Alert>
          ) : (
            <M.Typography
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "monospace",
                m: 0,
                fontSize: "12px",
                width: "100%",
                pb: 6,
              }}
            >
              {props.consoleOutput}
            </M.Typography>
          )}
        </M.Box>
        {!props.isLoading && !props.error && (
          <M.Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "rgba(0, 0, 0, 0.5)",
              px: 1,
              py: 0.5,
              borderRadius: 1,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <I.Refresh sx={{ fontSize: 16, color: "#fff" }} />
            <M.Typography sx={{ color: "#fff", fontSize: 12 }}>
              Refreshing in {countdown}s
            </M.Typography>
          </M.Box>
        )}
      </M.Stack>
    </MR.Modal>
  )
}
