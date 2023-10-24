import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"

const UserCard = () => {
  const { user } = MR.useMaipl()
  return (
    <M.Stack component={M.Paper} alignItems="center" padding={2} spacing={2}>
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

export default UserCard
