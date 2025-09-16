import { File } from "@maipl/api"
import { filesize } from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RR from "@tanstack/react-query"

function Usages() {
  const { client } = MR.useMaipl()
  const { data } = RR.useQuery({
    queryKey: ["files", "usage"],
    queryFn: () => File.usage(client),
    initialData: {
      public: 0,
      private: 0,
      raw: 0,
      dataset: 0,
      annotation: 0,
      model: 0,
      config: 0,
    },
  })
  return (
    <M.Stack component={M.Paper} padding={2}>
      <M.Typography variant="h5">Storage Usage</M.Typography>
      <M.Typography>Public Total {filesize(data.public)}</M.Typography>
      <M.Typography>Private Total {filesize(data.private)}</M.Typography>
      <M.Typography>Raw Data {filesize(data.raw)}</M.Typography>
      <M.Typography>Dataset {filesize(data.dataset)}</M.Typography>
      <M.Typography>Annotation {filesize(data.annotation)}</M.Typography>
      <M.Typography>Model {filesize(data.model)}</M.Typography>
      <M.Typography>Config {filesize(data.config)}</M.Typography>
    </M.Stack>
  )
}

export default Usages
