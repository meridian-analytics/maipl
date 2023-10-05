import * as K from "@maipl/constants"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"

function NavButton(props: { icon: typeof M.SvgIcon; to: string }) {
  const { icon: Icon } = props
  return (
    <M.Grid item md={3} sx={{ textAlign: "center" }}>
      <M.Button
        sx={{ height: 200, width: 200 }}
        variant="outlined"
        // todo: useNavigate if same-origin
        onClick={() => {
          window.location.href = props.to
        }}
        children={<Icon sx={{ fontSize: 100 }} />}
      />
    </M.Grid>
  )
}

export default function Dashboard() {
  return (
    <M.Container maxWidth="lg">
      <M.Grid
        container
        sx={{ height: "94vh" }}
        justifyItems={"center"}
        alignItems={"center"}
      >
        <NavButton icon={I.CloudUpload} to={K.MAIPL_FILE_FRONTEND} />
        <NavButton icon={I.Architecture} to={K.MAIPL_ANNOTATION_FRONTEND} />
        <NavButton icon={I.ModelTraining} to={K.MAIPL_MODEL_RUNNER_FRONTEND} />
        <NavButton icon={I.ModelTraining} to="#todo" />
      </M.Grid>
    </M.Container>
  )
}
