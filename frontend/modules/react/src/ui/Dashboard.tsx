import * as K from "@maipl/constants"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"

function NavButton(props: {
  icon: typeof M.SvgIcon
  label: string
  to: string | null | undefined
}) {
  const { icon: Icon } = props
  const isDisabled = !props.to

  return (
    <M.Stack
      component={M.Button}
      sx={{
        height: 200,
        width: 200,
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
      }}
      onClick={() => {
        if (!isDisabled) {
          window.location.href = props.to
        }
      }}
      disabled={isDisabled}
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
      <M.Stack direction="row" maxWidth="lg">
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
          icon={I.PlayCircle}
          label="Model Runner"
          to={K.MAIPL_MODEL_RUNNER_FRONTEND}
        />
        <NavButton
          icon={I.QueryStats}
          label="Metrics"
          to={K.MAIPL_METRICS_FRONTEND}
        />
        <NavButton
          icon={I.ModelTraining}
          label="Model Trainer"
          to={K.MAIPL_MODEL_TRAINER_FRONTEND}
        />
        <NavButton 
          icon={I.Storage} 
          label="Database Tool" 
          to={K.MAIPL_DATABASE_TOOL_FRONTEND} />
      </M.Stack>
    </M.Stack>
  )
}
