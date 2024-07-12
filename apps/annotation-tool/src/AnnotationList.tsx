import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as Specviz from "specviz-react"
import * as FilterContext from "./FilterContext"
import * as SchemaContext from "./SchemaContext"

export default function AnnotationList(props: {
  setShowFilters: (state: boolean) => void
  sx?: M.SxProps
}) {
  function order(a: Specviz.Region, b: Specviz.Region) {
    return a.x == b.x ? a.y - b.y : a.x - b.x
  }
  const filter = FilterContext.useContext()
  const schema = SchemaContext.useContext()
  const regions = Specviz.useRegion()
  return (
    <MR.Panel
      sx={props.sx}
      title={`Annotations (${regions.transformedRegions.size} / ${regions.regions.size})`}
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
                onClick={() => filter.dispatch(FilterContext.resetFilters())}
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
          {Array.from(regions.transformedRegions.values())
            .sort(order)
            .map(region => (
              <M.ListItem disablePadding key={region.id}>
                <M.ListItemButton
                  selected={regions.transformedSelection.has(region.id)}
                  onClick={() => regions.setSelection(new Set([region.id]))}
                >
                  <M.ListItemText
                    primary={schema.getLabel(
                      FilterContext.rjsfCheckboxesBugfix(region["label"]),
                    )}
                    secondary={F.duration(region.x, region.x + region.width)}
                  />
                </M.ListItemButton>
              </M.ListItem>
            ))}
        </M.List>
      }
    />
  )
}
