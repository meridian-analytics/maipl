import type { User } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import type * as R from "react"
import * as RR from "react-router-dom"
import { useMaipl } from "../context"
import Menu from "./Menu"

export default function Navbar(props: {
  children?: R.ReactNode
  sx?: M.AppBarProps["sx"]
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
              <Synchronizing />
              <GuestMenu />
            </>
          ) : (
            <>
              {props.children ?? <M.Stack flexGrow={1} />}
              <Synchronizing />
              <UserMenu user={maipl.user} />
            </>
          )}
        </M.Stack>
      </M.Toolbar>
    </M.AppBar>
  )
}

function GuestMenu() {
  return (
    <Menu>
      <M.MenuItem children="About" component={RR.Link} to="/about" />
    </Menu>
  )
}

function UserMenu(props: { user: User.t }) {
  const maipl = useMaipl()
  return (
    <Menu>
      <M.MenuItem children="Dashboard" component={RR.Link} to="/dashboard" />
      <M.MenuItem children="About" component={RR.Link} to="/about" />
      <M.MenuItem children="Profile" component={RR.Link} to="/profile" />
      <M.MenuItem
        children={`Signout: ${props.user.first_name || props.user.email}`}
        onClick={maipl.logout}
      />
    </Menu>
  )
}

function Synchronizing() {
  const isFetching = RQ.useIsFetching() > 0
  const isMutating = RQ.useIsMutating() > 0
  const isSynchronizing = MR.useDebounce(isFetching || isMutating, 1000) // debounce to prevent flickering
  if (isSynchronizing) return <I.Sync sx={{ color: M.colors.green[400] }} />
  return <I.Sync color="disabled" />
}
