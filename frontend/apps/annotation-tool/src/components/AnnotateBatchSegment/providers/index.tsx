import * as R from "react"
import * as RR from "react-router-dom"
import * as AppContext from "../../../AppContext"
import * as SchemaContext from "../../../SchemaContext"
import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as FilterContext from "../../../FilterContext"
import type { LoaderData } from "../types"
import { AxisProvider } from "./AxisProvider"
import { NoteProvider } from "./NoteProvider"
import { FxProvider } from "./FxProvider"
import { BaseToolProvider } from "./ToolProviders"
import Keybinds from "../../../Keybinds"

export function Provider(props: { children: R.ReactNode }) {
  const loaderData = RR.useLoaderData() as LoaderData
  return (
    <AppContext.Provider>
      <SchemaContext.Provider
        jsonSchema={loaderData.batch.annotation_file_text}
      >
        <Audio.Provider buffer={loaderData.active.audioBuffer}>
          <Specviz.Input.Provider>
            <AxisProvider>
              <FilterContext.Provider>
                <NoteProvider>
                  <FxProvider>
                    <Specviz.Viewport.Provider>
                      <BaseToolProvider>
                        {props.children}
                        <Specviz.Audio.Effect />
                        <Keybinds />
                      </BaseToolProvider>
                    </Specviz.Viewport.Provider>
                  </FxProvider>
                </NoteProvider>
              </FilterContext.Provider>
            </AxisProvider>
          </Specviz.Input.Provider>
        </Audio.Provider>
      </SchemaContext.Provider>
    </AppContext.Provider>
  )
}
