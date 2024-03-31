import * as F from "@maipl/format"
import * as M from "@mui/material"
import * as RR from "react-router-dom"
import * as A from "./AnnotationContext"
import Panel from "./Panel"

export default function SegmentList(props: {
  sx?: M.SxProps
}) {
  const ctx = A.useAnnotationContext()
  return (
    <Panel
      title={`Segments (${ctx.segments.length})`}
      sx={props.sx}
      contents={
        <M.List disablePadding>
          {ctx.segments.map(s => (
            <M.ListItem disablePadding key={s.id}>
              <M.ListItemButton
                component={RR.Link}
                to={`/annotate/${ctx.batch.id}/segment/${s.id}`}
                selected={s.id == ctx.active.segment?.id}
              >
                <M.ListItemText
                  primary={s.filename}
                  secondary={F.duration(s.start, s.end)}
                />
              </M.ListItemButton>
            </M.ListItem>
          ))}
        </M.List>
      }
    />
  )
}
