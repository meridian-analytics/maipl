import * as R from "react"
import * as M from "@mui/material"
import * as I from "@mui/icons-material"
import * as MR from "@maipl/react"

export function ShortcutsMenu() {
  const [anchorEl, setAnchorEl] = R.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <MR.ActionButton
        children={<I.Keyboard />}
        onClick={handleClick}
        title="Keyboard Shortcuts"
      />
      <M.Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            Tool Selection
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>A - Annotate</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>S - Select</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>D - Zoom</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>F - Move</M.Typography>
        </M.MenuItem>
        <M.Divider />
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            Annotation Movement
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>← - Move Left</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>→ - Move Right</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>↑ - Move Up</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>↓ - Move Down</M.Typography>
        </M.MenuItem>
        <M.Divider />
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            Audio Controls
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Z - Seek to Start</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>X - Play</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>C - Stop</M.Typography>
        </M.MenuItem>
        <M.Divider />
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            General
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Esc - Deselect</M.Typography>
        </M.MenuItem>
        <M.Divider />
        <M.MenuItem>
          <M.Typography variant="subtitle2" color="primary">
            Mouse Controls
          </M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Alt + Mouse Wheel - Zoom</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Ctrl/Cmd + Click - Zoom Out</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Click - Zoom In</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Drag - Pan/Move</M.Typography>
        </M.MenuItem>
        <M.MenuItem>
          <M.Typography>Right Click - Seek to Position</M.Typography>
        </M.MenuItem>
      </M.Menu>
    </>
  )
}
