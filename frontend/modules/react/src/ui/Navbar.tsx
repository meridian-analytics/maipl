import type { User } from "@maipl/api"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import type * as R from "react"
import * as RR from "react-router-dom"
import { useMaipl } from "../context"
import Menu from "./Menu"
import {
  MAIPL_ANNOTATION_FRONTEND,
  MAIPL_FILE_FRONTEND,
  MAIPL_METRICS_FRONTEND,
  MAIPL_MODEL_RUNNER_FRONTEND,
  MAIPL_MODEL_TRAINER_FRONTEND,
  MAIPL_DOCUMENTATION_URL,
} from "@maipl/constants"
import React from "react"

export default function Navbar(props: {
  children?: R.ReactNode
  sx?: M.AppBarProps["sx"]
}) {
  const maipl = useMaipl()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const allQuickAccessItems = [
    { name: "File Service", url: MAIPL_FILE_FRONTEND },
    { name: "Annotation Tool", url: MAIPL_ANNOTATION_FRONTEND },
    { name: "Model Runner", url: MAIPL_MODEL_RUNNER_FRONTEND },
    { name: "Metrics Tool", url: MAIPL_METRICS_FRONTEND },
    { name: "Model Trainer", url: MAIPL_MODEL_TRAINER_FRONTEND },
  ]

  // Filter out the current app
  const quickAccessItems = allQuickAccessItems.filter((item) => {
    try {
      const itemUrl = new URL(item.url)

      // Check if we're in development (localhost with port)
      if (window.location.hostname === "localhost") {
        return window.location.port !== itemUrl.port
      }

      // In production, compare the pathname
      return !window.location.pathname.startsWith(itemUrl.pathname)
    } catch (e) {
      return true
    }
  })

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
              <M.IconButton
                onClick={handleClick}
                size="small"
                sx={{ ml: 2 }}
                aria-controls={open ? "quick-access-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
              >
                <I.Apps />
              </M.IconButton>
              <M.Menu
                anchorEl={anchorEl}
                id="quick-access-menu"
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                {quickAccessItems.map((item) => (
                  <M.MenuItem key={item.name} component="a" href={item.url}>
                    {item.name}
                  </M.MenuItem>
                ))}
              </M.Menu>
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
        component="a"
        href={MAIPL_DOCUMENTATION_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Documentation
      </M.MenuItem>
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
