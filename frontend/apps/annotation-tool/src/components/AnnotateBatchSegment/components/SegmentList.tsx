import * as R from "react"
import * as RR from "react-router-dom"
import * as M from "@mui/material"
import * as F from "@maipl/format"
import type { LoaderData } from "../types"
import Panel from "../../../Panel"

export function SegmentList(props: { sx?: M.SxProps }) {
  const loaderData = RR.useLoaderData() as LoaderData
  return (
    <Panel
      title={`Segments (${loaderData.segments.length})`}
      sx={props.sx}
      contents={
        <M.List disablePadding>
          {loaderData.segments.map((s) => (
            <M.ListItem disablePadding key={s.id}>
              <M.ListItemButton
                component={RR.Link}
                to={`/annotate/${loaderData.batch.id}/segment/${s.id}`}
                selected={s.id == loaderData.active.segment.id}
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
