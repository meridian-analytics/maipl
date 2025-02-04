import { File } from "@maipl/api"
import * as F from "@maipl/format"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import { useMaipl } from "../context"
import Modal from "./Modal"

function Usages() {
  const { client } = useMaipl()
  const { data } = RQ.useQuery({
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
    <M.Stack component={M.Paper} flexGrow={1} padding={2}>
      <M.Typography variant="h5">Storage Usage</M.Typography>
      <M.Typography>Public Total {F.filesize(data.public)}</M.Typography>
      <M.Typography>Private Total {F.filesize(data.private)}</M.Typography>
      <M.Typography>Raw Data {F.filesize(data.raw)}</M.Typography>
      <M.Typography>Dataset {F.filesize(data.dataset)}</M.Typography>
      <M.Typography>Annotation {F.filesize(data.annotation)}</M.Typography>
      <M.Typography>Model {F.filesize(data.model)}</M.Typography>
      <M.Typography>Config {F.filesize(data.config)}</M.Typography>
    </M.Stack>
  )
}

const UserCard = () => {
  const { user } = useMaipl()
  return (
    <M.Stack component={M.Paper} alignItems="center" minWidth={300} padding={2}>
      {user == null ? (
        <p>Loading...</p>
      ) : (
        <>
          <M.Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
            <I.AccountCircle />
          </M.Avatar>
          <M.Typography variant="h6">{user.first_name}</M.Typography>
        </>
      )}
    </M.Stack>
  )
}

export default function Profile() {
  const navigate = RR.useNavigate()
  return (
    <Modal onClose={() => navigate(-1)}>
      <M.Stack direction="row">
        <UserCard />
        <Usages />
      </M.Stack>
    </Modal>
  )
}
