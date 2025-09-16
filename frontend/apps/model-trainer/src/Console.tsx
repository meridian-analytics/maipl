import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import { TrainerTask } from "@maipl/api"
import { Terminal } from "@maipl/react"

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
