import { Batch, File } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as DZ from "react-dropzone"
import * as RR from "react-router-dom"
import * as BatchParameters from "./schema/BatchParametersSchema.ts"

const style = {
  base: {
    borderColor: M.colors.grey[500],
    borderStyle: "dashed",
    borderWidth: 2,
    backgroundColor: M.colors.grey[100],
    padding: 4,
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

export default function EditBatchLoader() {
  const maipl = MR.useMaipl()
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const batchId = F.safeParseInteger(params.batchId, null)

  const { data: batch, error } = RQ.useQuery({
    enabled: batchId != null,
    queryKey: ["batches", batchId],
    queryFn: () => Batch.get(maipl.client, batchId!),
  })

  const onClose = () => {
    navigate(-1)
  }

  return (
    <MR.Modal onClose={onClose}>
      {error != null ? (
        <M.Typography>{(error as Error).message}</M.Typography>
      ) : (
        <EditBatch key={batchId} batch={batch} onClose={onClose} />
      )}
    </MR.Modal>
  )
}

enum Tab {
  files = "files",
  parameters = "parameters",
  segments = "segments",
}

enum SelectionType {
  initial = "initial",
  manual = "manual",
}

function EditBatch(props: {
  batch?: Batch.t
  onClose: () => void
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()

  const [tab, setTab] = R.useState<Tab>(Tab.files)
  const [selectionType, setSelectionType] = R.useState<SelectionType>(
    SelectionType.initial,
  )

  const [_createdAt, _setCreatedAt] = R.useState(
    () => props.batch?.created_at ?? new Date(),
  )
  const [description, setDescription] = R.useState(
    () => props.batch?.description ?? "",
  )

  const [name, setName] = R.useState(() => props.batch?.batch_name ?? "")
  const [parameters, setParameters] = R.useState(
    () => props.batch?.parameters ?? {},
  )
  const [_progress, _setProgress] = R.useState(() => props.batch?.progress ?? 0)
  const [template, setTemplate] = R.useState<null | string>(null)

  // segment generation
  const [length, setLength] = R.useState(60)
  const [step, setStep] = R.useState<null | number>(null)
  const [pad, setPad] = R.useState(false)

  const { data: templates } = RQ.useQuery({
    enabled: props.batch == null,
    queryKey: ["files"],
    queryFn: () =>
      File.list(maipl.client, {
        maipl_folder: File.t_maipl_folder.config,
        page: 1,
        size: 100,
      }).then(page =>
        Object.fromEntries(
          page.data
            .sort((a, b) => a.path.localeCompare(b.path))
            .map(f => [`${f.maipl_folder}/${f.path}`, String(f.id)]),
        ),
      ),
    initialData: {},
  })

  const table = MR.Files.useTable({
    selection: R.useMemo(
      () =>
        props.batch == null
          ? new Map<number, File.t>()
          : new Map(
              props.batch.filelist.map(id => [id, true as unknown as File.t]),
            ),
      [props.batch],
    ),
  })

  const { data: files } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.raw,
    path: table.debouncedFilter.get("path"),
    tag: table.debouncedFilter.get("tag"),
    page: table.pagination.pageIndex + 1,
    size: table.pagination.pageSize,
  })

  const [importFile, setImportFile] = R.useState<File | null>(null)
  const dz = DZ.useDropzone({
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    onDropAccepted: files => {
      setImportFile(files[0])
    },
  })
  const dzStyle = R.useMemo(
    () => ({
      ...style.base,
      ...(dz.isFocused ? style.focused : {}),
      ...(dz.isDragAccept ? style.accept : {}),
      ...(dz.isDragReject ? style.reject : {}),
    }),
    [dz.isFocused, dz.isDragAccept, dz.isDragReject],
  )

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
    if (createMutation.isIdle) {
      return createMutation.mutateAsync([
        maipl.client,
        {
          allow_change_settings: false,
          batch_name: name,
          description,
          filelist: [], // todo
          parameters: parameters as Batch.t_parameters, // todo: release enforcement of this type
        },
      ])
    }
  }

  const onUpdate = () => {}

  return (
    <MR.Modal onClose={props.onClose} sx={{ minWidth: 600 }}>
      <M.Stack sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography variant="h6">
          {props.batch == null ? "Create new batch ..." : name}
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
          <MR.Picker
            label="Annotation Configuration"
            setValue={setTemplate}
            value={template ?? ""}
            values={templates}
            fullWidth
          />
        </M.Stack>
        <M.Stack direction="row" flexGrow={1} justifyContent="center">
          <M.Tabs
            indicatorColor="primary"
            onChange={(_e, value) => setTab(value as Tab)}
            value={tab}
          >
            <M.Tab label="Files" value={Tab.files} />
            <M.Tab label="Segments" value={Tab.segments} />
            <M.Tab label="Spectrogram" value={Tab.parameters} />
          </M.Tabs>
        </M.Stack>
        {tab == Tab.files &&
          selectionType == SelectionType.initial &&
          importFile == null && (
            <M.Stack direction="row">
              <M.Stack
                component={M.Button}
                flexGrow={1}
                onClick={() => setSelectionType(SelectionType.manual)}
                padding={4}
              >
                <I.CheckBoxOutlined sx={{ fontSize: 50 }} />
                <M.Typography>Select Files</M.Typography>
              </M.Stack>

              <M.Stack
                {...dz.getRootProps({ sx: dzStyle })}
                alignItems="center"
                flexGrow={1}
              >
                <input {...dz.getInputProps()} />
                <I.InsertDriveFileOutlined sx={{ fontSize: 50 }} />
                <M.Typography>IMPORT .CSV</M.Typography>
              </M.Stack>
            </M.Stack>
          )}
        {tab == Tab.files &&
          selectionType == SelectionType.manual &&
          importFile == null && (
            <M.Stack>
              <M.Stack direction="row" alignItems="center">
                <M.TextField
                  label="Path"
                  onChange={e =>
                    table.filter.set("path", e.currentTarget.value)
                  }
                  placeholder="path/to/folder"
                  value={table.filter.get("path")}
                />
                <M.TextField
                  label="Tag"
                  onChange={e => table.filter.set("tag", e.currentTarget.value)}
                  placeholder="my-tag"
                  value={table.filter.get("tag")}
                />
                <M.Stack flexGrow={1} />
                <M.Button
                  size="medium"
                  children="Cancel selection"
                  onClick={() => setSelectionType(SelectionType.initial)}
                />
              </M.Stack>
              <MR.Files.Table
                rows={files.data}
                count={files.count}
                pagination={table.pagination}
                selection={table.selection}
                setPagination={table.setPagination}
                setSelection={table.setSelection}
                visibility={{
                  basename: false,
                  dirname: false,
                  extname: false,
                  channels: false,
                  sample_rate: false,
                  created_at: true,
                }}
              />
            </M.Stack>
          )}
        {tab == Tab.files && importFile && (
          <M.Stack
            {...dz.getRootProps({ sx: dzStyle })}
            direction="row"
            spacing={4}
          >
            <M.Stack alignItems="center">
              <I.InsertDriveFileOutlined sx={{ fontSize: 50 }} />
              <M.Typography>{importFile.name}</M.Typography>
              <M.Typography>{F.filesize(importFile.size)}</M.Typography>
            </M.Stack>
            <M.Stack padding={4}>
              <M.Typography>
                Files will be selected from the <code>file_path</code> column.
              </M.Typography>
              <M.Button
                children="Cancel import"
                onClick={() => setImportFile(null)}
              />
            </M.Stack>
          </M.Stack>
        )}
        {tab == Tab.segments && (
          <M.Stack>
            <M.TextField
              label="Length (seconds)"
              onChange={e =>
                setLength(Math.max(1, Number(e.currentTarget.value) || 60))
              }
              type="number"
              value={length}
            />
            <M.TextField
              label="Step (seconds)"
              onChange={e =>
                setStep(
                  e.currentTarget.value == ""
                    ? null
                    : Math.max(1, Number(e.currentTarget.value) || 60),
                )
              }
              type="number"
              value={step ?? length}
            />
            <MR.Switch value={pad} setValue={setPad} label="Pad" />
          </M.Stack>
        )}
        {tab == Tab.parameters && (
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
              readonly={(props.batch?.allow_change_settings ?? true) == false}
              schema={BatchParameters.schema}
              uiSchema={BatchParameters.uiSchema}
              validator={validator}
            />
          </M.Stack>
        )}
        <M.Stack direction="row">
          {selectionType == SelectionType.manual && (
            <M.Typography>
              Selection: {table.selection.size} files (
              {F.filesize(
                files.data.reduce(
                  (r, f) => r + (table.selection.has(f.id) ? f.size : 0),
                  0,
                ),
              )}
              )
            </M.Typography>
          )}
          <M.Stack flexGrow={1} />
          <M.Button children="Close" onClick={props.onClose} />
          {props.batch == null ? (
            <M.Button
              children="Create"
              disabled={createMutation.isPending}
              onClick={onCreate}
              variant="contained"
            />
          ) : (
            <M.Button children="Save" onClick={onUpdate} variant="contained" />
          )}
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
