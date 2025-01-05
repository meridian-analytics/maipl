import { Batch } from "@maipl/api"
import type * as MR from "@maipl/react"
import * as RR from "react-router-dom"
import * as Z from "zod"

export const loader = (maipl: MR.t_context) =>
  (async ({ request, params }) => {
    const batchId = Z.coerce.number().parse(params["batchId"])
    try {
      const batch = await Batch.get(maipl.client, batchId)
      if (batch.segments.length == 0)
        throw Error(`segments not found: ${batchId}`)
      return RR.redirect(`/annotate/${batchId}/segment/${batch.segments[0]}`)
    } catch (error) {
      throw Error(`batch not found: ${batchId}`)
    }
  }) satisfies RR.LoaderFunction
