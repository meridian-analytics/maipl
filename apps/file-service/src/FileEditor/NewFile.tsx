import { File } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import { Editor } from "@monaco-editor/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as Monaco from "monaco-editor"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"

export const element = <Element />

export const loader = (_maipl: MR.t_context) =>
  (async ({ request }) => {
    // folder query param
    const url = new URL(request.url)
    const search = url.searchParams
    const folder = search.get("folder") ?? "public"
    File.invariantMaiplFolder(folder)
    // payload
    return { folder }
  }) satisfies RR.LoaderFunction

function Element() {
  const navigate = RR.useNavigate()
  const { folder } = RRT.useLoaderData<ReturnType<typeof loader>>()
  const onClose = (hasUnsavedChanges?: boolean) => {
    hasUnsavedChanges == false && navigate(-1)
  }
  return <NewFile folder={folder} onClose={onClose} />
}

export default function NewFile(props: {
  folder: File.t_maipl_folder
  onClose: (hasUnsavedChanges?: boolean) => void
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()

  const [path, setPath] = R.useState("path/to/myfile.txt")
  const [tag, setTag] = R.useState("")
  const [value, setValue] = R.useState<undefined | string>("")
  const queryClient = RQ.useQueryClient()

  const language: Monaco.languages.ILanguageExtensionPoint | null =
    R.useMemo(() => {
      const lookup = path.match(/(\.[^.]+)$/)?.[1]
      if (lookup == null) return null
      return (
        Monaco.languages
          .getLanguages()
          .find(lang => lang?.extensions?.includes?.(lookup)) ?? null
      )
    }, [path])

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not create file "{vars[1].path}"
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("FileEditor createMutation error", err, vars)
      }
    },
    onSuccess: file => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Created file "{file.path}"
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["files"] })
      props.onClose(hasUnsavedChanges)
    },
  })

  const onCreate = () => {
    if (createMutation.isIdle) {
      return createMutation.mutateAsync([
        maipl.client,
        {
          file: new window.File([value ?? ""], path),
          maipl_folder: props.folder,
          meta: { maipl: "file" },
          path,
          tag,
        },
      ])
    }
  }

  const hasUnsavedChanges = R.useMemo(() => {
    return tag != "" || value != ""
  }, [tag, value])

  return (
    <MR.Modal
      onClose={() =>
        hasUnsavedChanges == false && props.onClose(hasUnsavedChanges)
      }
      sx={{ width: "100%" }}
    >
      <M.Stack spacing={2}>
        <M.Typography variant="h5">{path.split("/").at(-1)}</M.Typography>
        <M.Stack direction="row" spacing={2}>
          <MR.Picker
            disabled={true}
            label="Folder"
            setValue={() => {}}
            value={props.folder}
            values={[
              File.t_maipl_folder.public,
              File.t_maipl_folder.annotation,
              File.t_maipl_folder.config,
              File.t_maipl_folder.dataset,
              File.t_maipl_folder.model,
              File.t_maipl_folder.raw,
            ]}
          />
          <M.TextField
            fullWidth
            size="small"
            label="path"
            value={path}
            variant="outlined"
            onChange={e => setPath(e.currentTarget.value)}
          />
          <M.TextField
            size="small"
            label="tag"
            value={tag}
            variant="outlined"
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
        <M.Stack direction="row" spacing={2}>
          <M.Typography>{F.filesize(value?.length ?? 0)}</M.Typography>
          <M.Typography>{F.iso8601(new Date())}</M.Typography>
          <M.Typography>{language?.aliases?.[0] ?? "Plain Text"}</M.Typography>
          <M.Stack flexGrow={1} />
          <M.Button
            variant="outlined"
            color={hasUnsavedChanges ? "error" : "primary"}
            onClick={() => props.onClose(hasUnsavedChanges)}
            children={hasUnsavedChanges ? "Close Without Saving" : "Close"}
          />
          <M.Button
            color="success"
            children="Create"
            disabled={hasUnsavedChanges == false || createMutation.isPending}
            onClick={onCreate}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
