import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import { RunnerTask } from "@maipl/api"
import { Terminal } from "@maipl/react"

export default function LogLoader() {
  const navigate = RR.useNavigate()
  const maipl = MR.useMaipl()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params["taskId"], null)

  const onClose = () => {
    navigate(-1)
  }

  const { data, error, isLoading, refetch } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["runner-tasks-log", taskId],
    queryFn: () => {
      return RunnerTask.get_log(maipl.client, taskId!)
    },
  })

  const logOutput = typeof data === 'string' ? data : ''

  return <Terminal consoleOutput={logOutput} onClose={onClose} onRefresh={refetch} isLoading={isLoading} error={error} />
}
