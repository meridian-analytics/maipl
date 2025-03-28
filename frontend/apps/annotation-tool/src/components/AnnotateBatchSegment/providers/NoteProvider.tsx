import * as R from "react"
import * as RR from "react-router-dom"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import { Batch } from "@maipl/api"
import * as AppContext from "../../../AppContext"
import * as FilterContext from "../../../FilterContext"
import type { LoaderData } from "../types"
import { LoadRegionsEffect } from "./LoadRegionsEffect"
import { MyAnnotationSvg } from "../components/MyAnnotationSvg"

function supportOpenRegions(old: Specviz.Note.Region): Specviz.Note.Region {
  const { id, x, y, width, height, xunit, yunit, properties, ...splat } = old
  return {
    id,
    x,
    y,
    width,
    height,
    xunit,
    yunit,
    properties: {
      ...splat, // collect splat properties into properties object
      ...properties, // in collision, explicit properties override splat
    },
  }
}

export function NoteProvider(props: { children: R.ReactNode }) {
  const loaderData = RR.useLoaderData() as LoaderData
  const maipl = MR.useMaipl()
  const filter = FilterContext.useContext()
  const canCreate: Specviz.Note.Context["canCreate"] = R.useMemo(() => {
    switch (loaderData.role) {
      case Batch.t_role_code.unassigned:
      case Batch.t_role_code.viewer:
        return false
      case Batch.t_role_code.contributor:
      case Batch.t_role_code.collaborator:
      case Batch.t_role_code.owner:
        return true
    }
  }, [loaderData.role])
  const canDelete: Specviz.Note.Context<AppContext.UserData>["canDelete"] =
    R.useCallback(
      (region) => {
        switch (loaderData.role) {
          case Batch.t_role_code.unassigned:
          case Batch.t_role_code.viewer:
            return false
          case Batch.t_role_code.contributor:
            return region.properties?.user_id == maipl.user?.id
          case Batch.t_role_code.collaborator:
          case Batch.t_role_code.owner:
            return true
        }
      },
      [loaderData.role, maipl.user?.id]
    )
  const canRead: Specviz.Note.Context<AppContext.UserData>["canRead"] =
    R.useCallback(
      (region) => {
        switch (loaderData.role) {
          case Batch.t_role_code.unassigned:
            return false
          case Batch.t_role_code.contributor:
            return (
              region.properties?.user_id == loaderData.batch.user_id ||
              region.properties?.user_id == maipl.user?.id
            )
          case Batch.t_role_code.viewer:
          case Batch.t_role_code.collaborator:
          case Batch.t_role_code.owner:
            return true
        }
      },
      [loaderData.role, loaderData.batch.user_id, maipl.user?.id]
    )
  const canUpdate: Specviz.Note.Context<AppContext.UserData>["canUpdate"] =
    R.useCallback(
      (region) => {
        switch (loaderData.role) {
          case Batch.t_role_code.unassigned:
          case Batch.t_role_code.viewer:
            return false
          case Batch.t_role_code.contributor:
            return region.properties?.user_id == maipl.user?.id
          case Batch.t_role_code.collaborator:
          case Batch.t_role_code.owner:
            return true
        }
      },
      [loaderData.role, maipl.user?.id]
    )

  const initRegions = R.useMemo(() => {
    return new Map(
      loaderData.annotations.map((a) => [a.id, supportOpenRegions(a.region)])
    )
  }, [loaderData.annotations])

  return (
    <Specviz.Note.Provider
      canCreate={canCreate}
      canDelete={canDelete}
      canRead={canRead}
      canUpdate={canUpdate}
      children={
        <>
          <LoadRegionsEffect />
          {props.children}
        </>
      }
      render={MyAnnotationSvg}
      initRegions={initRegions}
      filterFn={filter.filterFn}
    />
  )
}
