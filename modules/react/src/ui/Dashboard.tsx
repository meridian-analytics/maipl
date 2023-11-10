import * as K from "@maipl/constants"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"

function NavButton(props: {
  icon: typeof M.SvgIcon
  label: string
  to: string
}) {
  const { icon: Icon } = props
  return (
    <M.Stack
      component={M.Button}
      sx={{ height: 200, width: 200 }}
      variant="outlined"
      onClick={() => {
        // todo: useNavigate if same-origin
        window.location.href = props.to
      }}
      spacing={2}
    >
      <Icon sx={{ fontSize: 100 }} />
      <M.Typography>{props.label}</M.Typography>
    </M.Stack>
  )
}

export default function Dashboard() {
  return (
    <M.Stack
      alignItems="center"
      justifyContent="center"
      sx={{ height: "100vh", overflow: "hidden" }}
    >
      <M.Stack direction="row" maxWidth="lg" spacing={2}>
        <NavButton
          icon={I.CloudUpload}
          label="File System"
          to={K.MAIPL_FILE_FRONTEND}
        />
        <NavButton
          icon={I.Architecture}
          label="Annotation Tool"
          to={K.MAIPL_ANNOTATION_FRONTEND}
        />
        <NavButton
          icon={I.ModelTraining}
          label="Model Runner"
          to={K.MAIPL_MODEL_RUNNER_FRONTEND}
        />
        <NavButton icon={I.QueryStats} label="Metrics" to="#todo" />
      </M.Stack>
    </M.Stack>
  )
}
