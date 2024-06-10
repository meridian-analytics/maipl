import { Batch, type User } from "@maipl/api"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as R from "react"

type BatchShareProps = {
  batch: Batch.t
  users: Array<User.t>
  shareTo: Map<number, Batch.t_role>
  setShareTo: R.Dispatch<R.SetStateAction<Map<number, Batch.t_role>>>
}

const colWidth = 60

const columns = [
  Batch.t_role.unassigned,
  Batch.t_role.viewer,
  Batch.t_role.contributor,
  Batch.t_role.collaborator,
  Batch.t_role.owner,
]

export default function BatchShare(props: BatchShareProps) {
  const [emailFilter, setEmailFilter] = R.useState("")

  const currState = R.useMemo<Map<number, Batch.t_role>>(
    function initialShareState() {
      return new Map(
        props.batch.shared_to.map(([user, role]) => [user.id, role]),
      )
    },
    [props.batch.shared_to],
  )

  function radioState(userId: number, role: Batch.t_role) {
    const curr = currState.get(userId) ?? Batch.t_role.unassigned
    const goal = props.shareTo.get(userId)
    return {
      disabled: goal == null ? curr == role : false,
      checked: goal == null ? curr == role : goal == role,
      onChange: () => {
        props.setShareTo(prev => {
          if (role == curr) {
            const next = new Map(prev)
            next.delete(userId)
            return next
          }
          return new Map(prev).set(userId, role)
        })
      },
    }
  }

  return (
    <M.Stack>
      <M.Stack
        direction="row"
        sx={{ height: 80, alignItems: "flex-end", paddingBottom: 2 }}
      >
        <M.Box flexGrow={1}>
          <M.TextField
            label="Search"
            onChange={e => setEmailFilter(e.currentTarget.value)}
            placeholder="user@mail.service"
            value={emailFilter}
          />
        </M.Box>
        {columns.map(role => (
          <M.Box key={role} sx={{ width: colWidth }}>
            <M.Typography
              children={Batch.t_role[role]}
              sx={{ transform: "rotate(-45deg)" }}
              variant="body2"
            />
          </M.Box>
        ))}
      </M.Stack>
      {props.users.map(user => (
        <M.Stack direction="row" key={user.id}>
          <MR.UserAvatar user={user} />
          <M.Typography flexGrow={1}>
            {user.email} {user.id}
          </M.Typography>
          {columns.map(role => (
            <M.Box key={role} sx={{ width: colWidth }}>
              <M.Radio name={user.email} {...radioState(user.id, role)} />
            </M.Box>
          ))}
        </M.Stack>
      ))}
    </M.Stack>
  )
}
