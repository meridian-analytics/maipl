import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import { TrainerTask } from "@maipl/api"
import { Log } from "@maipl/react"

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
    queryKey: ["trainer-tasks-log", taskId],
    queryFn: () => {
      return TrainerTask.get_log(maipl.client, taskId!)
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {(error as Error).message}</div>
  }

  return <Log data={data} onClose={onClose} onRefresh={refetch} />
}
