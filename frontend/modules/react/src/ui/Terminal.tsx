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
  const [countdown, setCountdown] = R.useState(10)
  const [autoScroll, setAutoScroll] = R.useState(true)
  
  // Limit console output length to prevent performance issues
  const truncatedOutput = props.consoleOutput && props.consoleOutput.length > 100000 
    ? props.consoleOutput.slice(-100000) + '\n\n... (output truncated, showing last 100KB)'
    : props.consoleOutput || ''

  const scrollToBottom = () => {
    if (consoleRef.current && autoScroll) {
      try {
        consoleRef.current.scrollTop = consoleRef.current.scrollHeight
      } catch (err) {
        console.error('Failed to scroll to bottom:', err)
      }
    }
  }

  const handleScroll = () => {
    if (consoleRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = consoleRef.current
      // Auto-scroll is enabled when user is near bottom (within 50px)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50
      if (autoScroll !== isNearBottom) {
        setAutoScroll(isNearBottom)
      }
    }
  }

  R.useEffect(() => {
    if (props.consoleOutput && props.consoleOutput.length > 0) {
      scrollToBottom()
    }
  }, [props.consoleOutput, autoScroll])

  R.useEffect(() => {
    if (props.consoleOutput && props.consoleOutput.length > 0) {
      const timer = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timer)
    }
  }, [props.consoleOutput, autoScroll])

  R.useEffect(() => {
    const interval = setInterval(() => {
      try {
        props.onRefresh()
        setCountdown(10)
      } catch (err) {
        console.error('Failed to refresh console:', err)
      }
    }, 10000) // Increased from 5 seconds to 10 seconds

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
      onClose={props.onClose}
      sx={{ 
        minWidth: 800, 
        height: "90vh"
      }}
    >
      <M.Stack sx={{ height: "100%", overflow: "hidden", position: "relative" }}>
        <M.Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1,
            borderBottom: "1px solid #ccc",
          }}
        >
          <M.Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <M.Chip
              label={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
              size="small"
              color={autoScroll ? "success" : "default"}
              variant="outlined"
              onClick={() => setAutoScroll(!autoScroll)}
              sx={{ cursor: "pointer" }}
            />
          </M.Box>
          <M.Box sx={{ display: "flex", gap: 1 }}>
            <M.IconButton 
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(props.consoleOutput || '')
                  // Could add a success notification here
                } catch (err) {
                  console.error('Failed to copy to clipboard:', err)
                  // Could add an error notification here
                }
              }}
              title="Copy to clipboard"
            >
              <I.ContentCopy />
            </M.IconButton>
            <M.IconButton onClick={props.onRefresh} title="Refresh">
              <I.Refresh />
            </M.IconButton>
            <M.IconButton onClick={props.onClose} title="Close">
              <I.Close />
            </M.IconButton>
          </M.Box>
        </M.Box>
        <M.Box
          ref={consoleRef}
          onScroll={handleScroll}
          sx={{
            flexGrow: 1,
            overflow: "auto",
            bgcolor: "#000",
            color: "#fff",
            p: 2,
            height: "calc(90vh - 120px)",
            position: "relative",
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              bgcolor: "rgba(255, 255, 255, 0.1)",
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(255, 255, 255, 0.3)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              bgcolor: "rgba(255, 255, 255, 0.5)",
            },
          }}
        >
          {props.isLoading ? (
            <M.Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <M.Stack alignItems="center" spacing={2}>
                <M.CircularProgress sx={{ color: "#fff" }} />
                <M.Typography sx={{ color: "#fff" }}>Loading console output...</M.Typography>
              </M.Stack>
            </M.Box>
          ) : props.error ? (
            <M.Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
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
            </M.Box>
          ) : props.consoleOutput ? (
            <M.Typography
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                fontFamily: "monospace",
                m: 0,
                fontSize: "12px",
                width: "100%",
                pb: 8,
                lineHeight: 1.4,
                tabSize: 2,
                overflowWrap: "break-word",
                wordWrap: "break-word",
                hyphens: "auto",
                maxWidth: "100%",
                userSelect: "text",
                cursor: "text",
                // Remove minHeight constraint to allow content to expand naturally
                display: "block",
              }}
            >
              {truncatedOutput || ''}
            </M.Typography>
          ) : (
            <M.Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <M.Typography sx={{ color: "#fff", opacity: 0.7 }}>
                No console output available
              </M.Typography>
            </M.Box>
          )}
        </M.Box>
        {!props.isLoading && !props.error && (
          <>
            {props.consoleOutput && props.consoleOutput.length > 100000 && (
              <M.Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "rgba(255, 193, 7, 0.95)",
                  color: "#000",
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  zIndex: 10,
                  pointerEvents: "none",
                  backdropFilter: "blur(4px)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                }}
              >
                <I.Warning sx={{ fontSize: 16 }} />
                <M.Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                  Output truncated (showing last 100KB)
                </M.Typography>
              </M.Box>
            )}

            <M.Box
              sx={{
                position: "absolute",
                bottom: 8,
                left: 8,
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: "rgba(0, 0, 0, 0.8)",
                px: 2,
                py: 1,
                borderRadius: 2,
                zIndex: 10,
                pointerEvents: "none",
                backdropFilter: "blur(4px)",
              }}
            >
              <I.Refresh sx={{ fontSize: 16, color: "#fff" }} />
              <M.Typography sx={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>
                Refreshing in {countdown}s
              </M.Typography>
            </M.Box>
          </>
        )}
      </M.Stack>
    </MR.Modal>
  )
}
