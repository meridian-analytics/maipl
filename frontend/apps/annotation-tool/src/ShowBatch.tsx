import { Batch, File, User } from "@maipl/api"
import * as F from "@maipl/format"
import * as JS from "@maipl/js"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"
import BatchShare from "./BatchShare"
import {
  MagSpectrogramSchema,
  MagSpectrogramUiSchema,
  MelSpectrogramSchema,
  MelSpectrogramUiSchema,
} from "./schema/BatchParametersSchema"
import * as I from "@mui/icons-material"

export enum Tab {
  files = "files",
  spectrogram = "spectrogram",
  segments = "segments",
  share = "share",
}

type LoaderProps = {
  annotationFile: File.t
  batch: Batch.t
  users: Array<User.t>
  tab: Tab
}

type ShowBatchProps = {
  annotationFile: File.t
  batch: Batch.t
  onClose: () => void
  users: Array<User.t>
  tab: Tab
}

export const loader = (maipl: MR.t_context) =>
  (async ({ request, params }): Promise<LoaderProps> => {
    // get batch id
    const batchId = F.safeParseInteger(params["batchId"], null)
    if (batchId == null) throw Error(`Invalid batch id: ${batchId}`)
    // batch and user dependencies
    const [batch, users] = await Promise.all([
      Batch.get(maipl.client, batchId),
      User.list(maipl.client),
    ])
    // annotationFile dependency
    const annotationFile = await File.get(maipl.client, batch.annotation_file)
    // tab present in url
    const u = new URL(request.url)
    const tab = u.searchParams.get("tab")
    if (tab) {
      JS.invariantEnum(tab, Tab, "ShowBatch.Tab")
      return { batch, users, annotationFile, tab }
    }
    // tab not preset in url
    return { batch, users, annotationFile, tab: Tab.files }
  }) satisfies RR.LoaderFunction

export function Element() {
  const { annotationFile, batch, tab, users } =
    RRT.useLoaderData<ReturnType<typeof loader>>()
  const navigate = RR.useNavigate()
  const onClose = () => {
    navigate("/batches")
  }
  return (
    <ShowBatch
      annotationFile={annotationFile}
      batch={batch}
      onClose={onClose}
      tab={tab}
      users={users}
    />
  )
}

export default function ShowBatch(props: ShowBatchProps) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()
  const [_searchParams, setSearchParams] = RR.useSearchParams()

  // field: name
  const [name] = R.useState(props.batch.batch_name)

  // field: created_at
  const [description] = R.useState(props.batch.description)

  // field: parameters (for spectrogram)
  const [parameters] = R.useState(props.batch.parameters)
  const [spectrogramType] = R.useState<"MagSpectrogram" | "MelSpectrogram">(
    () =>
      (props.batch.parameters as { type: "MagSpectrogram" | "MelSpectrogram" })
        .type
  )

  // field: annotation_file
  const [annotationFile] = R.useState<null | number>(
    props.batch.annotation_file
  )

  // field: segment_parameters
  const [segmentParameters] = R.useState(props.batch.segment_parameters)

  // field: share_to
  const [shareTo] = R.useState<Map<number, Batch.t_role_code>>(() => new Map())

  const table = MR.Files.useTable({
    selection: R.useMemo(
      () =>
        new Map(
          props.batch.filelist.map((id) => [id, true as unknown as File.t])
        ),
      [props.batch]
    ),
  })

  const { data: files } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.raw,
    path: table.debouncedFilter.get("path"),
    tag: table.debouncedFilter.get("tag"),
    page: table.pagination.pageIndex + 1,
    size: table.pagination.pageSize,
  })

  return (
    <MR.Modal
      onClose={props.onClose}
      sx={{
        width: "1000px",
        maxWidth: "60vw",
        height: "90vh",
      }}
    >
      <M.Stack
        sx={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <M.Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <M.Typography variant="h6">
            {props.batch == null ? "Create new batch ..." : name}
          </M.Typography>
          <M.IconButton onClick={props.onClose} title="Close">
            <I.Close />
          </M.IconButton>
        </M.Stack>
        <M.Stack component={M.Paper} padding={2}>
          <M.TextField label="Batch Name" value={name} disabled />
          <M.TextField label="Description" value={description} disabled />
          <M.FormControl fullWidth>
            <M.InputLabel>Spectrogram Type</M.InputLabel>
            <M.Select value={spectrogramType} disabled label="Spectrogram Type">
              <M.MenuItem value="MagSpectrogram">
                Magnitude Spectrogram
              </M.MenuItem>
              <M.MenuItem value="MelSpectrogram">Mel Spectrogram</M.MenuItem>
            </M.Select>
          </M.FormControl>
          <MR.Picker
            disabled={true}
            label="Annotation Configuration"
            setValue={() => {}}
            value={String(annotationFile)}
            values={
              annotationFile == null
                ? { NullFile: "null" }
                : {
                    [`${props.annotationFile.maipl_folder}/${props.annotationFile.path}`]:
                      String(annotationFile),
                  }
            }
            fullWidth
          />
        </M.Stack>
        <M.Stack direction="row" justifyContent="center">
          <M.Tabs
            indicatorColor="primary"
            onChange={(_e, value) => setSearchParams({ tab: value })}
            value={props.tab ?? Tab.files}
          >
            <M.Tab label="Files" value={Tab.files} />
            <M.Tab label="Segments" value={Tab.segments} />
            <M.Tab label="Spectrogram" value={Tab.spectrogram} />
            <M.Tab label="Share" value={Tab.share} />
          </M.Tabs>
        </M.Stack>
        <M.Box
          sx={{
            width: "100%",
            flexGrow: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0, // This is important for flex child to respect parent height
          }}
        >
          <M.Box
            sx={{
              width: "100%",
              flexGrow: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              minHeight: 0, // This is important for flex child to respect parent height
            }}
          >
            {props.tab == Tab.files && (
              <M.Stack sx={{ flexGrow: 1, width: "100%", overflow: "hidden" }}>
                <M.Stack direction="row" alignItems="center">
                  <M.TextField
                    label="Path"
                    disabled
                    placeholder="path/to/folder"
                    value={table.filter.get("path")}
                  />
                  <M.TextField
                    label="Tag"
                    disabled
                    placeholder="my-tag"
                    value={table.filter.get("tag")}
                  />
                  <M.Stack flexGrow={1} />
                </M.Stack>
                <M.Box sx={{ width: "100%", overflow: "auto" }}>
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
                </M.Box>
              </M.Stack>
            )}
            {props.tab == Tab.segments && (
              <M.Stack
                component={M.Paper}
                sx={{
                  flexGrow: 1,
                  width: "100%",
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: 2,
                }}
              >
                <M.TextField
                  label="Length (seconds)"
                  disabled
                  type="number"
                  value={segmentParameters.length}
                />
                <M.TextField
                  label="Step (seconds)"
                  disabled
                  type="number"
                  value={segmentParameters.step ?? segmentParameters.length}
                />
                <MR.Switch value={segmentParameters.pad} disabled label="Pad" />
              </M.Stack>
            )}
            {props.tab == Tab.spectrogram && (
              <M.Stack
                component={M.Paper}
                sx={{
                  flexGrow: 1,
                  width: "100%",
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: 2,
                }}
              >
                <Form
                  children=" "
                  formData={parameters}
                  readonly={true}
                  schema={
                    spectrogramType === "MagSpectrogram"
                      ? MagSpectrogramSchema
                      : MelSpectrogramSchema
                  }
                  uiSchema={
                    spectrogramType === "MagSpectrogram"
                      ? MagSpectrogramUiSchema
                      : MelSpectrogramUiSchema
                  }
                  validator={validator}
                />
              </M.Stack>
            )}
            {props.tab == Tab.share && (
              <M.Stack
                component={M.Paper}
                sx={{
                  flexGrow: 1,
                  width: "100%",
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: 2,
                }}
              >
                <BatchShare
                  batch={props.batch}
                  shareTo={shareTo}
                  setShareTo={() => {}}
                  users={props.users}
                  readOnly
                />
              </M.Stack>
            )}
          </M.Box>
        </M.Box>
        <M.Stack
          direction="row"
          sx={{
            mt: 2,
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0, // Prevent the footer from shrinking
          }}
        >
          <M.Typography>
            Selection: {table.selection.size} files (
            {F.filesize(
              files.data.reduce(
                (r, f) => r + (table.selection.has(f.id) ? f.size : 0),
                0
              )
            )}
            )
          </M.Typography>
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
