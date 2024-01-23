import { Batch, File } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
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
}

export default function EditBatchLoader() {
  const navigate = RR.useNavigate()

  const onClose = () => {
    navigate(-1)
  }

  return (
    <MR.Modal onClose={onClose}>
      <EditBatch onClose={onClose} />
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

function optionsForFiles(files: Map<number, File.t>): Record<string, string> {
  return Object.fromEntries(
    Array.from(
      files.values(),
      f => [`${f.maipl_folder}/${f.path}`, String(f.id)] as const,
    ).sort((a, b) => a[0].localeCompare(b[0])),
  )
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

  // field: name
  const [name, setName] = R.useState("")

  // field: created_at
  const [description, setDescription] = R.useState("")

  // field: parameters (for spectrogram)
  const [parameters, setParameters] = R.useState({})

  // field: annotation_file
  const [annotationFile, setAnnotationFile] = R.useState<null | number>(null)

  const { data: annotationFiles } = RQ.useQuery({
    queryKey: ["files", File.t_maipl_folder.config],
    queryFn: () =>
      File.list(maipl.client, {
        maipl_folder: File.t_maipl_folder.config,
        page: 1,
        size: 100,
      }).then(page => new Map(page.data.map(f => [f.id, f]))),
    initialData: new Map<number, File.t>(),
  })

  // field: import_file
  const [importFile, setImportFile] = R.useState<null | number>(null)

  const { data: importFiles } = RQ.useQuery({
    queryKey: ["files", File.t_maipl_folder.annotation],
    queryFn: () =>
      File.list(maipl.client, {
        maipl_folder: File.t_maipl_folder.annotation,
        page: 1,
        size: 100,
      }).then(page => new Map(page.data.map(f => [f.id, f]))),
    initialData: new Map<number, File.t>(),
  })

  // field: segment_parameters
  const [segmentParameters, setSegmentParameters] =
    R.useState<Batch.t_segment_parameters>(() => ({
      length: 60,
      step: undefined,
      pad: false,
    }))

  const table = MR.Files.useTable()

  const { data: files } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.raw,
    path: table.debouncedFilter.get("path"),
    tag: table.debouncedFilter.get("tag"),
    page: table.pagination.pageIndex + 1,
    size: table.pagination.pageSize,
  })

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
    onSettled: () => {
      createMutation.reset()
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
          annotation_file: annotationFile ?? 0,
          batch_name: name,
          description,
          import_file: importFile ?? null,
          filelist: importFile ? [] : Array.from(table.selection.keys()), // todo
          parameters: parameters as Batch.t_parameters, // todo: release enforcement of this type
          segment_parameters: segmentParameters,
        },
      ])
    }
  }

  return (
    <MR.Modal onClose={props.onClose} sx={{ minWidth: 600 }}>
      <M.Stack sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography variant="h6">Create new batch ...</M.Typography>
        <M.Stack component={M.Paper} padding={2}>
          <M.TextField
            label="Batch Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <M.TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <MR.Picker
            label="Annotation Configuration"
            setValue={value => setAnnotationFile(Number(value))}
            value={annotationFile ? String(annotationFile) : ""}
            values={optionsForFiles(annotationFiles)}
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

              <M.Stack sx={style.base} alignItems="center" flexGrow={1}>
                <I.InsertDriveFileOutlined sx={{ fontSize: 50 }} />
                <MR.Picker
                  label="IMPORT .CSV"
                  setValue={value => setImportFile(Number(value))}
                  value=""
                  values={optionsForFiles(importFiles)}
                  fullWidth
                />
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
                  onChange={e => table.filter.set("path", e.target.value)}
                  placeholder="path/to/folder"
                  value={table.filter.get("path")}
                />
                <M.TextField
                  label="Tag"
                  onChange={e => table.filter.set("tag", e.target.value)}
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
          <M.Stack sx={style.base} direction="row" spacing={4}>
            <M.Stack alignItems="center">
              <I.InsertDriveFileOutlined sx={{ fontSize: 50 }} />
              <M.Typography>
                {importFiles.get(importFile)!.basename}
              </M.Typography>
              <M.Typography>
                {F.filesize(importFiles.get(importFile)!.size)}
              </M.Typography>
            </M.Stack>
            <M.Stack padding={4}>
              <M.Typography>
                Files and annotations will be imported from this file.
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
                setSegmentParameters(prev => ({
                  ...prev,
                  length: Math.max(1, Number(e.target.value) || 60),
                }))
              }
              type="number"
              value={segmentParameters.length}
            />
            <M.TextField
              label="Step (seconds)"
              onChange={e =>
                setSegmentParameters(prev => ({
                  ...prev,
                  step:
                    e.target.value == ""
                      ? undefined
                      : Math.max(1, Number(e.target.value) || 60),
                }))
              }
              type="number"
              value={segmentParameters.step ?? segmentParameters.length}
            />
            <MR.Switch
              value={segmentParameters.pad}
              setValue={v =>
                setSegmentParameters(prev => ({
                  ...prev,
                  pad: typeof v == "function" ? v(prev.pad) : v,
                }))
              }
              label="Pad"
            />
          </M.Stack>
        )}
        <M.Stack
          component={M.Paper}
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingX: 2,
            // use visiblity to ensure Form stays mounted; fixes #6
            visibility: tab == Tab.parameters ? "visible" : "hidden",
          }}
        >
          <Form
            children=" "
            formData={parameters}
            onChange={e => setParameters(e.formData)}
            schema={BatchParameters.schema}
            uiSchema={BatchParameters.uiSchema}
            validator={validator}
          />
        </M.Stack>
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
          <M.Button
            children="Create"
            disabled={createMutation.isPending}
            onClick={onCreate}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
