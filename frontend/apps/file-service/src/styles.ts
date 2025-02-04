import * as M from "@mui/material"

// Styles for the dropzone area
export const style = {
  base: {
    borderColor: M.colors.grey[500],
    borderStyle: "dashed",
    borderWidth: 2,
    backgroundColor: M.colors.grey[100],
    padding: 6,
  },
  focused: {
    borderColor: M.colors.blue[500],
  },
  accept: {
    borderColor: M.colors.green[500],
  },
  reject: {
    borderColor: M.colors.red[500],
  },
} 