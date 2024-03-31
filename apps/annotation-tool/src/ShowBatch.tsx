import { Batch, File } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import * as BatchParameters from "./schema/BatchParametersSchema"

export default function ShowBatchLoader() {
  const maipl = MR.useMaipl()
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const batchId = F.safeParseInteger(params["batchId"], null)

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
      ) : batch == null ? (
        <M.CircularProgress />
      ) : (
        <ShowBatch key={batchId} batch={batch} onClose={onClose} />
      )}
    </MR.Modal>
  )
}

enum Tab {
  files = "files",
  parameters = "parameters",
  segments = "segments",
}

function ShowBatch(props: {
  batch: Batch.t
  onClose: () => void
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()

  const [tab, setTab] = R.useState<Tab>(Tab.files)

  // field: name
  const [name, setName] = R.useState(props.batch.batch_name)

  // field: created_at
  const [description, setDescription] = R.useState(props.batch.description)

  // field: parameters (for spectrogram)
  const [parameters, setParameters] = R.useState(props.batch.parameters)

  // field: annotation_file
  const [annotationFile, _setAnnotationFile] = R.useState<null | number>(
    props.batch.annotation_file,
  )

  // field: segment_parameters
  const [segmentParameters, setSegmentParameters] = R.useState(
    props.batch.segment_parameters,
  )

  const table = MR.Files.useTable({
    selection: R.useMemo(
      () =>
        new Map(
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

  const updateMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Batch.patch>) => Batch.patch(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not update batch
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("ShowBatch update error", err, vars)
      }
    },
    onSettled: () => {
      updateMutation.reset()
    },
    onSuccess: () => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: updated batch{" "}
          {
            <M.Link
              component={RR.Link}
              to={`/batches/${props.batch.id}`}
              children={`#${props.batch.id}`}
            />
          }
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["batches"] })
      props.onClose()
    },
  })

  const onUpdate = () => {
    if (updateMutation.isIdle) {
      return updateMutation.mutateAsync([
        maipl.client,
        {
          id: props.batch.id,
          batch_name: name,
          description,
          filelist: Array.from(table.selection.keys()),
          parameters,
          segment_parameters: segmentParameters,
        },
      ])
    }
  }

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
            onChange={e => setName(e.target.value)}
          />
          <M.TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <MR.Picker
            disabled={true}
            label="Annotation Configuration"
            setValue={() => {}}
            value={String(annotationFile)}
            values={{
              [annotationFile ?? "null"]: annotationFile
                ? String(annotationFile)
                : "null",
            }}
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
        {tab == Tab.files && (
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
              readonly={(props.batch.allow_change_settings ?? true) == false}
              schema={BatchParameters.schema}
              uiSchema={BatchParameters.uiSchema}
              validator={validator}
            />
          </M.Stack>
        )}
        <M.Stack direction="row">
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
          <M.Stack flexGrow={1} />
          <M.Button children="Close" onClick={props.onClose} />
          <M.Button
            children="Save"
            disabled={updateMutation.isPending}
            onClick={onUpdate}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
