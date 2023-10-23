import { File, Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as R from "react"

function* makeSegments(
  file: File.t,
  length: number,
  step: number,
  pad: boolean,
  tag: string,
): Generator<Segment.t_create_request> {
  const duration = File.safeMeta(file, "audio", "duration", 0)
  let remaining = duration
  let start = 0
  while (remaining > 0) {
    yield {
      file: file.id,
      filename: file.path,
      start,
      end: start + Math.min(remaining, length),
      tag,
    }
    remaining = remaining - step
    start = start + step
  }
  if (pad) {
    yield {
      file: file.id,
      filename: file.path,
      start: duration,
      end: duration + length,
      tag,
    }
  }
}

function GenerateSegments(props: {
  onClose: () => void
  files: Array<File.t>
}) {
  const { files } = props
  const { client } = MR.useMaipl()

  const [length, setLength] = R.useState(60)
  const [step, setStep] = R.useState(60)
  const [tag, setTag] = R.useState("")
  const [pad, setPad] = R.useState(false)

  const segments = R.useMemo(
    () =>
      files.flatMap(f => Array.from(makeSegments(f, length, step, pad, tag))),
    [files, length, step, pad, tag],
  )

  const onCreate = async () => {
    await Promise.all(segments.map(s => Segment.create(client, s)))
    props.onClose()
  }

  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack spacing={2} sx={{ maxHeight: "100%", overflow: "hidden" }}>
        <M.Typography variant="h5">
          Selected Files ({files.length})
        </M.Typography>
        <MR.Files.Table
          {...MR.useTable<File.t>()}
          rows={files}
          sx={{ maxHeight: "35vh" }}
          visibility={{
            basename: false,
            dirname: false,
            extname: false,
            select: false,
            tag: false,
          }}
        />
        <M.Typography variant="h5">Segment Parameters:</M.Typography>
        <M.Stack direction="row" spacing={2}>
          <M.TextField
            label="Tag (optional)"
            onChange={e => setTag(e.currentTarget.value)}
            size="small"
            value={tag}
            variant="outlined"
            fullWidth
          />
          <M.TextField
            label="Length (seconds)"
            onChange={e =>
              setLength(Math.max(1, Number(e.currentTarget.value) || 60))
            }
            size="small"
            type="number"
            value={length}
            variant="outlined"
          />
          <M.TextField
            label="Step (seconds)"
            onChange={e =>
              setStep(Math.max(1, Number(e.currentTarget.value) || 60))
            }
            size="small"
            type="number"
            value={step}
            variant="outlined"
          />
          <M.FormControlLabel
            control={
              <M.Switch
                checked={pad}
                onChange={(_e, value) => setPad(value)}
                size="small"
              />
            }
            label="Pad"
          />
        </M.Stack>
        <M.Typography variant="h5">Segments Preview:</M.Typography>
        <MR.Segments.Table
          {...MR.useTable<Segment.t>()}
          rows={segments as Segment.t[]}
          sx={{ maxHeight: "35vh" }}
          visibility={{
            select: false,
          }}
        />
        <M.Stack direction="row-reverse" spacing={2}>
          <M.Button
            children="Create"
            color="primary"
            disabled={segments.length === 0}
            onClick={onCreate}
            variant="contained"
          />
          <M.Button
            children="Cancel"
            color="primary"
            onClick={props.onClose}
            variant="outlined"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}

export default GenerateSegments
