import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import { RunnerTask } from "@maipl/api"
import { Terminal } from "@maipl/react"

export default function ConsolePage() {
  const navigate = RR.useNavigate()
  const maipl = MR.useMaipl()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params["taskId"], null)

  const onClose = () => {
    navigate(-1)
  }

  const { data, error, isLoading, refetch } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["runner-tasks-console", taskId],
    queryFn: () => {
      return RunnerTask.get_console(maipl.client, taskId!)
    },
  })

  // The data itself is the console output
  const consoleOutput = typeof data === 'string' ? data : ''

  return (
    <Terminal
      consoleOutput={consoleOutput}
      onClose={onClose}
      onRefresh={refetch}
      isLoading={isLoading}
      error={error}
    />
  )
}
