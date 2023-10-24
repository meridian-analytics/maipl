import { User } from "@maipl/api"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"
import * as RR from "react-router-dom"
import { useMaipl } from "../context.tsx"

export default function Navbar(props: {
  children?: R.ReactNode
  sx?: M.SxProps
}) {
  const maipl = useMaipl()
  return (
    <M.AppBar
      color="default"
      elevation={3}
      position="static"
      sx={{ flexShrink: 0, ...props.sx }}
    >
      <M.Toolbar>
        <M.Stack alignItems="center" direction="row" spacing={4} width="100%">
          <M.Typography variant="h6" color={M.colors.red[900]}>
            MAIPL
          </M.Typography>
          {maipl.user == null ? (
            <>
              <M.Stack flexGrow={1} />
              <M.Typography children="..." />
            </>
          ) : (
            <>
              {props.children ?? <M.Stack flexGrow={1} />}
              <UserNavBar user={maipl.user} />
            </>
          )}
        </M.Stack>
      </M.Toolbar>
    </M.AppBar>
  )
}

function UserNavBar(props: { user: User.t }) {
  const [anchorEl, setAnchorEl] = R.useState<null | HTMLElement>(null)
  const buttonId = R.useId()
  const menuId = R.useId()
  const maipl = useMaipl()
  const open = anchorEl != null

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const onClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <M.IconButton
        aria-controls={open ? menuId : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="true"
        children={<I.Menu />}
        id={buttonId}
        onClick={onClick}
      />
      <M.Menu
        anchorEl={anchorEl}
        id={menuId}
        onClose={onClose}
        open={open}
        MenuListProps={{
          "aria-labelledby": buttonId,
        }}
      >
        <M.MenuItem children="Dashboard" component={RR.Link} to="/dashboard" />
        <M.MenuItem children="About" component={RR.Link} to="/about" />
        <M.MenuItem children="Profile" component={RR.Link} to="/profile" />
        <M.MenuItem
          children={`Signout: ${props.user.first_name || props.user.email}`}
          onClick={maipl.logout}
        />
      </M.Menu>
    </>
  )
}
