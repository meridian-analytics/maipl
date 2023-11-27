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
import * as BatchParameters from "./schema/BatchParametersSchema.ts"

function EditBatch(props: { isNew: boolean }) {
  const params = RR.useParams()
  const batchId = safeParseInteger(params.batchId, null)
  const maipl = MR.useMaipl()
  const navigate = RR.useNavigate()

  const { data: batch, error } = RQ.useQuery({
    queryKey: ["batches", batchId],
    queryFn: () => Batch.get(maipl.client, batchId!),
    enabled: batchId != null,
  })

  const onClose = () => {
    navigate(-1)
  }

  if (error) {
    return (
      <MR.Modal onClose={onClose}>
        <M.Typography>{(error as Error).message}</M.Typography>
      </MR.Modal>
    )
  }

  return props.isNew || batchId != null ? (
    <EditBatch_ key={batch?.id} onClose={onClose} batch={batch} />
  ) : (
    <></>
  )
}

function EditBatch_(props: { batch?: Batch.t; onClose: () => void }) {
  const { batch } = props
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const queryClient = RQ.useQueryClient()
  const [allowChanges, setAllowChanges] = R.useState(
    () => batch?.allow_change_settings ?? false,
  )
  const [_createdAt, _setCreatedAt] = R.useState(
    () => batch?.created_at ?? new Date(),
  )
  const [description, setDescription] = R.useState(
    () => batch?.description ?? "",
  )
  const [form, setForm] = R.useState<string | Error>(() => batch?.form ?? "")
  const [name, setName] = R.useState(() => batch?.batch_name ?? "")
  const [parameters, setParameters] = R.useState(() => batch?.parameters ?? {})
  const [_progress, _setProgress] = R.useState(() => batch?.progress ?? 0)
  const [segments, _setSegments] = R.useState(() => batch?.segments ?? [])
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
      File.list(maipl.client, queryParams).then(page =>
        Object.fromEntries(
          page.data
            .sort((a, b) => a.path.localeCompare(b.path))
            .map(f => [f.file, `${f.maipl_folder}/${f.path}`]),
        ),
      ),
    initialData: {},
  })

  const templateQuery = RQ.useQuery({
    enabled: template != "__",
    queryFn: () => fetch(template).then(res => res.text()),
    queryKey: ["templates", template],
    initialData: "",
  })

  R.useEffect(() => {
    if (templateQuery.error) {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not load template "{template}"
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("EditBatch selectTemplate error", templateQuery.error)
      }
    }
  }, [templateQuery.error, notify, template])

  R.useEffect(() => {
    if (templateQuery.data != null) {
      console.warn(
        "EditBatch selectTemplate warning: validate template not implemented",
      ) // todo
      setForm(templateQuery.data)
    }
  }, [templateQuery.data, setForm])

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Batch.create>) =>
      Batch.create(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not create batch
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("EditBatch create error", err, vars)
      }
    },
    onSuccess: batch => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Created batch{" "}
          {
            <M.Link
              component={RR.Link}
              to={`/batches/${batch.id}`}
              children={batch.batch_name}
            />
          }
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["batches"] })
      props.onClose()
    },
  })

  const onCreate = () => {
    if (form instanceof Error) return
    if (createMutation.isIdle) {
      return createMutation.mutateAsync([
        maipl.client,
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
  }

  const onUpdate = () => {
    console.warn("FileEditor onUpdate not implemented")
  }

  const templateSelectorId = R.useId()

  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography variant="h6">
          {batch == null ? "Create new batch ..." : name}
        </M.Typography>
        <M.Stack component={M.Paper} padding={2}>
          <M.TextField
            label="Batch Name"
            value={name}
            onChange={e => setName(e.currentTarget.value)}
          />
          <M.TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.currentTarget.value)}
          />
          <M.Stack direction="row" alignItems="center">
            <M.FormControl disabled={batch != null} fullWidth>
              <M.InputLabel id={templateSelectorId}>Template</M.InputLabel>
              <M.Select
                label="Template"
                labelId={templateSelectorId}
                onChange={e => setTemplate(e.target.value)}
                value={template}
              >
                <M.MenuItem value="__">Choose a template...</M.MenuItem>
                {Object.entries(templates).map(([key, option]) => (
                  <M.MenuItem key={key} value={key}>
                    {option}
                  </M.MenuItem>
                ))}
              </M.Select>
            </M.FormControl>
            {templateQuery.isLoading ? (
              <I.CloudSyncOutlined />
            ) : templateQuery.isError ? (
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
        <M.Stack direction="row-reverse">
          {batch == null ? (
            <M.Button
              children="Create"
              disabled={createMutation.isPending}
              onClick={onCreate}
              variant="contained"
            />
          ) : (
            <M.Button children="Save" onClick={onUpdate} variant="contained" />
          )}
          <M.Button children="Close" onClick={props.onClose} />
          <M.Stack flexGrow={1} />
          <M.FormControlLabel
            control={
              <M.Switch
                checked={allowChanges}
                onChange={(_e, value) => setAllowChanges(value)}
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
