import * as R from "react"
import * as RQ from "@tanstack/react-query"
import { useMaipl } from "../context"
import { Metrics } from "@maipl/api"

function useQuery(params: Metrics.t_list_request) {
  const { client, user } = useMaipl()
  return RQ.useQuery({
    enabled: user != null,
    queryKey: ["metrics", "tasks", params],
    queryFn: () => Metrics.list(client, params),
    initialData: (): Metrics.t_list_response => ([]),
  })
}

export { useQuery }
