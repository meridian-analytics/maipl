import * as M from "@mui/material"

const theme = M.createTheme({
  components: {
    MuiButton: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiChip: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: "small",
      },
    },
    MuiIconButton: {
      defaultProps: {
        size: "small",
      },
    },
    MuiSelect: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiStack: {
      defaultProps: {
        spacing: 2,
      },
    },
    MuiSwitch: {
      defaultProps: {
        size: "small",
      },
    },
    MuiTable: {
      defaultProps: {
        size: "small",
      },
    },
    MuiTableCell: {
      defaultProps: {
        size: "small",
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
  },
  palette: {
    primary: {
      main: M.colors.grey[900],
    },
    secondary: {
      main: "#19857b",
    },
    error: {
      main: M.colors.red.A400,
    },
  },
})

export default theme
