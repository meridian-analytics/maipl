import { Batch, File } from "@maipl/api"
import { safeParseInteger } from "@maipl/format"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import * as BatchParameters from "./schema/BatchParametersSchema.js"

function EditBatch(props: { isNew: boolean; onClose: () => void }) {
  const params = RR.useParams()
  const batchId = safeParseInteger(params.batchId, null)
  const { client } = MR.useMaipl()

  const { data: batch, error } = RQ.useQuery({
    queryKey: ["batches", batchId],
    queryFn: () => Batch.get(client, batchId!),
    enabled: batchId != null,
  })

  if (error) {
    return (
      <MR.Modal onClose={props.onClose}>
        <M.Typography>{(error as Error).message}</M.Typography>
      </MR.Modal>
    )
  }

  return props.isNew || batchId != null ? (
    <EditBatch_ key={batch?.id} onClose={props.onClose} batch={batch} />
  ) : (
    <></>
  )
}

function EditBatch_(props: { batch?: Batch.t; onClose: () => void }) {
  const { batch } = props
  const { client } = MR.useMaipl()

  const queryClient = RQ.useQueryClient()
  const [allowChanges, setAllowChanges] = R.useState(
    () => batch?.allow_change_settings ?? false,
  )
  const [createdAt, setCreatedAt] = R.useState(
    () => batch?.created_at ?? new Date(),
  )
  const [description, setDescription] = R.useState(
    () => batch?.description ?? "",
  )
  const [form, setForm] = R.useState<string | Error>(() => batch?.form ?? "")
  const [name, setName] = R.useState(() => batch?.batch_name ?? "")
  const [parameters, setParameters] = R.useState(() => batch?.parameters ?? {})
  const [progress, setProgress] = R.useState(() => batch?.progress ?? 0)
  const [segments, setSegments] = R.useState(() => batch?.segments ?? [])
  const [template, setTemplate] = R.useState(() => "__")

  const queryParams = R.useMemo(
    () => ({
      maipl_folder: "config" as File.t_maipl_folder,
      page: 1,
      size: 100,
    }),
    [],
  )

  const { data: templates } = RQ.useQuery({
    enabled: batch == null,
    queryKey: ["files", queryParams],
    queryFn: () =>
      File.list(client, queryParams).then(page =>
        Object.fromEntries(
          page.data
            .sort((a, b) => a.path.localeCompare(b.path))
            .map(f => [f.file, `${f.maipl_folder}/${f.path}`]),
        ),
      ),
    initialData: {},
  })

  const selectTemplate = RQ.useMutation({
    mutationFn: ([url]: [string]) => {
      setTemplate(url)
      return url == "__"
        ? Promise.resolve("")
        : fetch(url).then(res => res.text())
    },
    onSuccess: (data, vars) => {
      console.warn(
        "EditBatch selectTemplate warning: validate template not implemented",
      ) // todo
      setForm(data)
    },
    onError: err => {
      console.error("EditBatch selectTemplate error", err)
      setForm(Error("Failed to load template"))
    },
  })

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Batch.create>) =>
      Batch.create(...vars),
    onSuccess: () => {
      queryClient.refetchQueries(["batches"])
      props.onClose()
    },
    onError: err => {
      console.error("EditBatch create err", err)
    },
  })

  const onCreate = () => {
    if (form instanceof Error) return
    createMutation.mutate([
      client,
      {
        allow_change_settings: allowChanges,
        batch_name: name,
        description,
        form,
        parameters: parameters as Batch.t_parameters, // todo: release enforcement of this type
        segments,
      },
    ])
  }

  const onUpdate = () => {
    console.warn("FileEditor onUpdate not implemented")
  }

  const templateSelectorId = R.useId()

  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography variant="h6">
          {batch == null ? "Create new batch ..." : name}
        </M.Typography>
        <M.Stack component={M.Paper} padding={2} spacing={2}>
          <M.TextField
            size="small"
            label="Batch Name"
            value={name}
            variant="outlined"
            onChange={e => setName(e.currentTarget.value)}
          />
          <M.TextField
            size="small"
            label="Description"
            value={description}
            variant="outlined"
            onChange={e => setDescription(e.currentTarget.value)}
          />
          <M.Stack direction="row" spacing={2} alignItems={"center"}>
            <M.FormControl disabled={batch != null} fullWidth>
              <M.InputLabel id={templateSelectorId}>Template</M.InputLabel>
              <M.Select
                label={"Template"}
                labelId={templateSelectorId}
                onChange={e => selectTemplate.mutate([e.target.value])}
                size="small"
                value={template}
                variant="outlined"
              >
                <M.MenuItem value="__">Choose a template...</M.MenuItem>
                {Object.entries(templates).map(([key, option]) => (
                  <M.MenuItem key={key} value={key}>
                    {option}
                  </M.MenuItem>
                ))}
              </M.Select>
            </M.FormControl>
            {selectTemplate.isLoading ? (
              <I.CloudSyncOutlined />
            ) : selectTemplate.isError ? (
              <I.SyncProblemOutlined color="error" />
            ) : form instanceof Error ? (
              <I.AssignmentLateOutlined color="error" />
            ) : form != "" ? (
              <I.AssignmentTurnedInOutlined color="success" />
            ) : (
              <I.MoreHorizOutlined />
            )}
          </M.Stack>
        </M.Stack>
        <M.Stack
          component={M.Paper}
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingX: 2,
          }}
        >
          <Form
            children=" "
            formData={parameters}
            onChange={e => setParameters(e.formData)}
            readonly={(batch?.allow_change_settings ?? true) == false}
            schema={BatchParameters.schema}
            uiSchema={BatchParameters.uiSchema}
            validator={validator}
          />
        </M.Stack>
        <M.Stack direction="row-reverse" spacing={2}>
          {batch == null ? (
            <M.Button
              children="Create"
              color="primary"
              onClick={onCreate}
              variant="contained"
            />
          ) : (
            <M.Button
              children="Save"
              color="primary"
              onClick={onUpdate}
              variant="contained"
            />
          )}
          <M.Button
            children="Close"
            color="primary"
            onClick={props.onClose}
            variant="outlined"
          />
          <M.Stack flexGrow={1} />
          <M.FormControlLabel
            control={
              <M.Switch
                checked={allowChanges}
                onChange={(_e, value) => setAllowChanges(value)}
                size="small"
              />
            }
            disabled={true}
            label="Allow Changes"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}

export default EditBatch
