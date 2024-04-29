import type { User } from "@maipl/api"
import * as M from "@mui/material"
import UserAvatar from "./UserAvatar"

const avatarSxProps: M.AvatarProps["sx"] = {
  width: 24,
  height: 24,
  fontSize: 12,
}

export type UserAvatarGroupProps = {
  users: User.t[]
}

export default function UserAvatarGroup(props: UserAvatarGroupProps) {
  return (
    <M.AvatarGroup
      children={props.users.map(user => (
        <UserAvatar key={user.id} user={user} sx={avatarSxProps} />
      ))}
      max={4}
      slotProps={{
        additionalAvatar: {
          sx: avatarSxProps,
        },
      }}
    />
  )
}
