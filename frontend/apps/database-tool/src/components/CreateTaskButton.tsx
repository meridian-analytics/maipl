import * as M from "@mui/material"
import * as R from "react"
import { useState } from "react"
import CreateTaskDialog from "./CreateTaskDialog"

export default function CreateTaskButton() {
  const [open, setOpen] = useState(false)

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  return (
    <>
      <M.Button
        variant="contained"
        onClick={handleOpen}
      >
        Create Database Task
      </M.Button>
      
      <CreateTaskDialog open={open} onClose={handleClose} />
    </>
  )
} 