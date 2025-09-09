import { File, TrainerTask } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"

export default function ShowTaskLoader() {
  const maipl = MR.useMaipl()
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const taskId = F.safeParseInteger(params["taskId"], null)

  const { data: task, error } = RQ.useQuery({
    enabled: taskId != null,
    queryKey: ["trainer-tasks", taskId],
    queryFn: () => TrainerTask.get(maipl.client, taskId!),
  })

  const { data: datasetFile } = RQ.useQuery({
    enabled: task != null,
    queryKey: ["files", task?.dataset_file],
    queryFn: () => File.get(maipl.client, task!.dataset_file),
  })

  const { data: recipeFile } = RQ.useQuery({
    enabled: task != null,
    queryKey: ["files", task?.recipe_file],
    queryFn: () => File.get(maipl.client, task!.recipe_file),
  })

  const onClose = () => {
    navigate(-1)
  }

  return (
    <MR.Modal onClose={onClose}>
      {error != null ? (
        <M.Typography>{(error as Error).message}</M.Typography>
      ) : task == null ? (
        <M.CircularProgress />
      ) : (
        <ShowTask
          key={task.id}
          task={task}
          datasetFile={datasetFile}
          recipeFile={recipeFile}
          onClose={onClose}
        />
      )}
    </MR.Modal>
  )
}

function ShowTask(props: {
  task: TrainerTask.t
  datasetFile?: File.t
  recipeFile?: File.t
  onClose: () => void
}) {
  const { task, datasetFile, recipeFile } = props

  // Extract dataset groups and options if present
  const datasetConfig = (task.dataset_config || {}) as any
  const trainGroups: string[] = Array.isArray(datasetConfig.train)
    ? datasetConfig.train
    : []
  const valGroups: string[] = Array.isArray(datasetConfig.val)
    ? datasetConfig.val
    : []
  const trainOptions = (datasetConfig.train_options || {}) as Record<
    string,
    { annotation?: string; batchSize?: number }
  >
  const valOptions = (datasetConfig.val_options || {}) as Record<
    string,
    { annotation?: string; batchSize?: number }
  >

  return (
    <M.Stack sx={{ maxHeight: "100%", overflow: "auto", gap: 2 }}>
      <M.Typography variant="h6">Task #{task.id}</M.Typography>

      <Section title="Overview">
        <M.Grid container spacing={2}>
          <M.Grid item xs={12} md={8}>
            <LabeledText label="Name" value={task.name} />
          </M.Grid>
          <M.Grid item xs={12} md={4}>
            <LabeledText label="Status" value={task.status} />
          </M.Grid>
          <M.Grid item xs={12}>
            <LabeledText label="Description" value={task.description} />
          </M.Grid>
        </M.Grid>
      </Section>

      <Section title="Files">
        <M.Grid container spacing={2}>
          <M.Grid item xs={12} md={6}>
            <LabeledText
              label="Dataset File"
              value={
                datasetFile
                  ? `${datasetFile.maipl_folder}/${datasetFile.path}`
                  : String(task.dataset_file)
              }
              monospace
            />
          </M.Grid>
          <M.Grid item xs={12} md={6}>
            <LabeledText
              label="Recipe File"
              value={
                recipeFile
                  ? `${recipeFile.maipl_folder}/${recipeFile.path}`
                  : String(task.recipe_file)
              }
              monospace
            />
          </M.Grid>
        </M.Grid>
      </Section>

      <Section title="Train Groups">
        {trainGroups.length === 0 ? (
          <M.Typography color="text.secondary">None</M.Typography>
        ) : (
          <M.Stack spacing={1}>
            {trainGroups.map((g) => (
              <M.Stack key={g} direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <LabeledText label="Group" value={g} sx={{ flex: 2, minWidth: 240 }} monospace />
                <LabeledText
                  label="Annotation Dataset"
                  value={trainOptions[g]?.annotation || ""}
                  sx={{ flex: 3, minWidth: 280 }}
                  monospace
                />
                {trainOptions[g]?.batchSize != null && (
                  <LabeledText
                    label="Batch Size"
                    value={String(trainOptions[g]?.batchSize)}
                    sx={{ width: 160 }}
                  />
                )}
              </M.Stack>
            ))}
          </M.Stack>
        )}
      </Section>

      <Section title="Validation Groups">
        {valGroups.length === 0 ? (
          <M.Typography color="text.secondary">None</M.Typography>
        ) : (
          <M.Stack spacing={1}>
            {valGroups.map((g) => (
              <M.Stack key={g} direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <LabeledText label="Group" value={g} sx={{ flex: 2, minWidth: 240 }} monospace />
                <LabeledText
                  label="Annotation Dataset"
                  value={valOptions[g]?.annotation || ""}
                  sx={{ flex: 3, minWidth: 280 }}
                  monospace
                />
                {valOptions[g]?.batchSize != null && (
                  <LabeledText
                    label="Batch Size"
                    value={String(valOptions[g]?.batchSize)}
                    sx={{ width: 160 }}
                  />
                )}
              </M.Stack>
            ))}
          </M.Stack>
        )}
      </Section>

      <Section title="Options">
        <OptionsView options={task.options as Record<string, unknown>} />
      </Section>

      <M.Stack direction="row-reverse" spacing={2}>
        <M.Button children="Close" onClick={props.onClose} />
      </M.Stack>
    </M.Stack>
  )
}

function OptionsView(props: { options: Record<string, unknown> }) {
  const entries = Object.entries(props.options || {})
  if (entries.length === 0) {
    return <M.Typography color="text.secondary">None</M.Typography>
  }
  return (
    <M.Grid container spacing={2}>
      {entries.map(([key, value]) => (
        <M.Grid key={key} item xs={12} md={6}>
          <LabeledText label={key} value={stringifyValue(value)} />
        </M.Grid>
      ))}
    </M.Grid>
  )
}

function stringifyValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function LabeledText(props: { label: string; value: string; sx?: M.SxProps; monospace?: boolean }) {
  return (
    <M.Stack sx={{ gap: 0.5, ...props.sx }}>
      <M.Typography variant="subtitle2" color="text.secondary">
        {props.label}
      </M.Typography>
      <M.Typography
        variant="body1"
        sx={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: props.monospace ? "Monospace" : undefined,
        }}
      >
        {props.value}
      </M.Typography>
    </M.Stack>
  )
}

function Section(props: { title: string; children: React.ReactNode; sx?: M.SxProps }) {
  return (
    <M.Paper variant="outlined" sx={{ p: 2, ...props.sx }}>
      <M.Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>
        {props.title}
      </M.Typography>
      {props.children}
    </M.Paper>
  )
}


