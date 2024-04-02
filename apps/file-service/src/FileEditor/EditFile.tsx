import { File } from "@maipl/api"
import * as F from "@maipl/format"
import * as JS from "@maipl/js"
import * as MR from "@maipl/react"
import { Editor } from "@monaco-editor/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as Monaco from "monaco-editor"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"

export const element = <Element />

export const loader = (maipl: MR.t_context) =>
  (async ({ request, params }) => {
    // file id
    const fileId = F.safeParseInteger(params["fileId"], null)
    JS.invariant(fileId != null, `EditFile fileId: ${fileId}`)
    // folder query param
    const url = new URL(request.url)
    const search = url.searchParams
    const folder = search.get("folder") ?? "raw"
    File.invariantMaiplFolder(folder)
    // file resource
    const file = await File.get(maipl.client, fileId)
    // file contents
    const fileContents = await fetch(file.file)
      .then(r => r.arrayBuffer())
      .then(buffer => new TextDecoder("utf-8").decode(buffer))
    // payload
    return { fileId, folder, file, fileContents }
  }) satisfies RR.LoaderFunction

function Element() {
  const { fileId, folder, file, fileContents } =
    RRT.useLoaderData<ReturnType<typeof loader>>()
  const navigate = RR.useNavigate()
  const onClose = () => {
    navigate(-1)
  }
  return (
    <EditFile
      key={fileId}
      file={file}
      fileContents={fileContents}
      folder={folder}
      onClose={onClose}
    />
  )
}

export default function EditFile(props: {
  file: File.t
  fileContents: string
  folder: File.t_maipl_folder
  onClose: () => void
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()

  const [path, setPath] = R.useState(props.file.path)
  const [tag, setTag] = R.useState(props.file.tag)
  const [value, setValue] = R.useState<undefined | string>(props.fileContents)

  const language: Monaco.languages.ILanguageExtensionPoint | null =
    R.useMemo(() => {
      const lookup = props.file?.extname ?? path.match(/(\.[^.]+)$/)?.[1]
      if (lookup == null) return null
      return (
        Monaco.languages
          .getLanguages()
          .find(lang => lang?.extensions?.includes?.(lookup)) ?? null
      )
    }, [props.file, path])

  const updateMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.update>) => File.update(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not update file "{vars[2].path}"
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("FileEditor updateMutation error", err, vars)
      }
    },
    onSettled: () => {
      updateMutation.reset()
    },
    onSuccess: file => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Updated file "{file.path}""
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["files"] })
      props.onClose()
    },
  })

  const onUpdate = () => {
    if (props.file == null) {
      throw Error("FileEditor onUpdate called with no file")
    }
    if (updateMutation.isIdle) {
      return updateMutation.mutateAsync([
        maipl.client,
        props.file.id,
        {
          file: new window.File([value ?? ""], path),
          maipl_folder: props.file.maipl_folder,
          meta: props.file.meta,
          path,
          tag,
        },
      ])
    }
  }

  const hasUnsavedChanges = R.useMemo(() => {
    return tag != props.file.tag || value != props.fileContents
  }, [props.file, props.fileContents, tag, value])

  return (
    <MR.Modal
      onClose={() => hasUnsavedChanges == false && props.onClose()}
      sx={{ width: "100%" }}
    >
      <M.Stack>
        <M.Typography variant="h5">{props.file.basename}</M.Typography>
        <M.Stack direction="row">
          <M.TextField
            fullWidth
            label="path"
            value={path}
            onChange={e => setPath(e.currentTarget.value)}
            disabled={true}
          />
          <M.TextField
            label="tag"
            value={tag}
            onChange={e => setTag(e.currentTarget.value)}
          />
        </M.Stack>
        <Editor
          defaultValue="// Write some code..."
          height="600px"
          language={language?.id ?? "plaintext"}
          onChange={setValue}
          options={{
            minimap: { enabled: false },
          }}
          value={value}
        />
        <M.Stack direction="row">
          <M.Typography>{F.filesize(value?.length ?? 0)}</M.Typography>
          <M.Typography>{F.iso8601(props.file.created_at)}</M.Typography>
          <M.Typography>{language?.aliases?.[0] ?? "Plain Text"}</M.Typography>
          <M.Stack flexGrow={1} />
          <M.Button
            color={hasUnsavedChanges ? "error" : "primary"}
            onClick={() => props.onClose()}
            children={hasUnsavedChanges ? "Close Without Saving" : "Close"}
          />
          <M.Button
            color="success"
            children="Save"
            disabled={hasUnsavedChanges == false || updateMutation.isPending}
            onClick={onUpdate}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
