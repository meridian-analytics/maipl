import type { User } from "@maipl/api"
import * as M from "@mui/material"
import UserAvatar from "./UserAvatar"

function avatarSxProps(size: number): M.AvatarProps["sx"] {
  return {
    width: size * 2,
    height: size * 2,
    fontSize: size,
  }
}

export type UserAvatarGroupProps = {
  count?: number
  size?: number
  users: User.t[]
}

export default function UserAvatarGroup(props: UserAvatarGroupProps) {
  return (
    <M.AvatarGroup
      children={props.users.map(user => (
        <UserAvatar
          key={user.id}
          user={user}
          sx={avatarSxProps(props.size ?? 12)}
        />
      ))}
      max={props.count ?? 4}
      slotProps={{
        additionalAvatar: {
          sx: avatarSxProps(props.size ?? 12),
        },
      }}
    />
  )
}
