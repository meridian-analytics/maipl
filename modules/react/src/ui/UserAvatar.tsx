import type { User } from "@maipl/api"
import * as M from "@mui/material"

export type UserAvatarProps = {
  user: User.t
  sx?: M.AvatarProps["sx"]
}

export default function UserAvatar(props: UserAvatarProps) {
  return (
    <M.Avatar
      alt={props.user.email.at(0)}
      children={initials(props.user.first_name, props.user.last_name)}
      sx={{
        bgcolor: emailToColor(props.user.email),
        ...props.sx,
      }}
    />
  )
}

function initials(first: string, last: string) {
  const x = first[0] ?? ""
  const y = last[0] ?? ""
  const res = (x + y).toUpperCase()
  return res == "" ? "?" : res
}

function emailToColor(email: string) {
  let hash = 0
  for (let i = 0; i < email.length; i += 1) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = "#"
  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 255
    color += `00${value.toString(16)}`.slice(-2)
  }
  return color
}
