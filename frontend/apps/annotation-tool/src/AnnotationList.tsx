import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as React from "react"
import type * as AppContext from "./AppContext"
import * as FilterContext from "./FilterContext"
import * as SchemaContext from "./SchemaContext"

export default function AnnotationList(props: {
  setShowFilters: (state: boolean) => void
  sx?: M.SxProps
}) {
  function order(a: Specviz.Note.Region, b: Specviz.Note.Region) {
    return a.x == b.x ? a.y - b.y : a.x - b.x
  }
  const filter = FilterContext.useContext()
  const note = Specviz.Note.useContext()
  return (
    <MR.Panel
      sx={props.sx}
      title={`Annotations (${note.regions.size} / ${note.count})`}
      actions={
        Object.keys(filter.filters).length > 0
          ? [
              <MR.ActionButton
                key="0"
                children={<I.FilterList color="primary" />}
                onClick={() => props.setShowFilters(true)}
                title="Edit Filters"
              />,
              <MR.ActionButton
                key="1"
                children={<I.FilterListOff color="warning" />}
                onClick={() => filter.resetFilters()}
                title="Reset Filters"
              />,
            ]
          : [
              <MR.ActionButton
                key="0"
                children={<I.FilterList color="primary" />}
                onClick={() => props.setShowFilters(true)}
                title="Open Filters"
              />,
            ]
      }
      contents={
        <M.List disablePadding>
          {Array.from(note.regions.values())
            .sort(order)
            .map(r => (
              <AnnotationListItem key={r.id} {...r} />
            ))}
        </M.List>
      }
    />
  )
}

export function AnnotationListItem(
  props: Specviz.Note.Region<AppContext.UserData>,
) {
  const schema = SchemaContext.useContext()
  const note = Specviz.Note.useContext()
  const primary = React.useMemo(
    () =>
      [
        schema.getLabel(props.properties?.label),
        props.properties?.comments,
      ].join(" - "),
    [props.properties?.comments, props.properties?.label, schema.getLabel],
  )
  const secondary = F.duration(props.x, props.x + props.width)
  return (
    <M.ListItem disablePadding key={props.id}>
      <M.ListItemButton
        selected={note.selection.has(props.id)}
        onClick={e => {
          note.select(new Set([props.id]), Specviz.Note.selectionMode(e))
        }}
      >
        <M.ListItemText primary={primary} secondary={secondary} />
      </M.ListItemButton>
    </M.ListItem>
  )
}
