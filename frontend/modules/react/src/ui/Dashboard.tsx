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
    <M.Button
      sx={{
        height: 200,
        minWidth: 180,
        width: "100%",
        maxWidth: 200,
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
        display: "flex",
        padding: 0,
      }}
      onClick={() => {
        if (!isDisabled) {
          window.location.href = props.to
        }
      }}
      disabled={isDisabled}
    >
      <M.Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
          width: "100%",
        }}
      >
        <Icon sx={{ fontSize: 100, flexShrink: 0, display: "block" }} />
        <M.Typography sx={{ textAlign: "center" }}>{props.label}</M.Typography>
      </M.Box>
    </M.Button>
  )
}

function ToolGroup(props: {
  title: string
  children: React.ReactNode
  sx?: M.StackProps["sx"]
}) {
  return (
    <M.Stack
      direction="column"
      alignItems="center"
      gap={2}
      sx={{
        width: "100%",
        flex: 1,
        minHeight: 0,
        ...props.sx,
      }}
    >
      <M.Typography variant="h6" component="h2" sx={{ textTransform: "uppercase" }}>
        {props.title}
      </M.Typography>
      <M.Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {props.children}
      </M.Box>
    </M.Stack>
  )
}

function PlaceholderButton() {
  return (
    <M.Stack
      sx={{
        height: 200,
        width: 200,
        border: 2,
        borderColor: "divider",
        borderRadius: 2,
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
      }}
    >
      <M.Typography variant="body2">Coming soon</M.Typography>
    </M.Stack>
  )
}

const paperSx = {
  flex: 1,
  minHeight: 0,
  p: 3,
  display: "flex",
  justifyContent: "center",
  alignContent: "center",
  flexWrap: "wrap",
  gap: 2,
  overflow: "auto",
  "& > *": {
    flex: "1 1 200px",
    minWidth: 180,
    maxWidth: 200,
  },
} as const

export default function Dashboard() {
  return (
    <M.Stack
      direction="row"
      sx={{
        height: "100vh",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <M.Stack
        direction="column"
        sx={{
          flex: 1,
          minWidth: 0,
          p: 5,
          overflow: "hidden",
        }}
      >
        <ToolGroup title="Acoustic Tools">
          <M.Paper
            variant="outlined"
            sx={{
              ...paperSx,
            }}
          >
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
              to={K.MAIPL_DATABASE_TOOL_FRONTEND}
            />
          </M.Paper>
        </ToolGroup>
      </M.Stack>
      <M.Stack
        direction="column"
        sx={{
          flex: 1,
          minWidth: 0,
          p: 5,
          overflow: "hidden",
        }}
      >
        <ToolGroup title="Other Tools">
          <M.Paper
            variant="outlined"
            sx={{
              ...paperSx,
            }}
          >
            <PlaceholderButton />
          </M.Paper>
        </ToolGroup>
      </M.Stack>
    </M.Stack>
  )
}
