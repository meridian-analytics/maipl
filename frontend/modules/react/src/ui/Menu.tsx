import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"

export default function Menu(props: {
  autoClose?: boolean
  children: R.ReactNode
  color?: M.IconButtonProps["color"]
  icon?: R.ReactNode
  title?: M.TooltipProps["title"]
}) {
  const [anchorEl, setAnchorEl] = R.useState<HTMLElement | null>(null)
  const buttonId = R.useId()
  const menuId = R.useId()
  const open = anchorEl != null

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const onClose = () => {
    setAnchorEl(null)
  }

  const button = (
    <M.IconButton
      aria-controls={open ? menuId : undefined}
      aria-expanded={open ? "true" : undefined}
      aria-haspopup="true"
      children={props.icon ?? <I.Menu />}
      id={buttonId}
      onClick={onClick}
      color={props.color}
    />
  )

  return (
    <>
      {props.title ? (
        <M.Tooltip children={button} title={props.title} />
      ) : (
        button
      )}
      <M.Menu
        anchorEl={anchorEl}
        children={props.children}
        id={menuId}
        open={open}
        onClick={props.autoClose != false ? onClose : undefined}
        onClose={onClose}
        MenuListProps={{
          "aria-labelledby": buttonId,
        }}
      />
    </>
  )
}
