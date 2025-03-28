import { Annotation, Batch, type Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as RQ from "@tanstack/react-query"
import type { LoaderData } from "./types"

export const AnnotateBatchSegmentQuery = (
  maipl: MR.t_context,
  batchId: number,
  segmentId: number
) => ({
  queryKey: ["annotate-batch-segment", batchId, segmentId],
  queryFn: async (): Promise<LoaderData> => {
    const batch = await Batch.get(maipl.client, batchId)
    if (batch == null) throw Error(`batch not found: ${batchId}`)

    const role =
      batch.role == null
        ? batch.user_id == maipl.user?.id
          ? Batch.t_role_code.owner
          : Batch.t_role_code.unassigned
        : batch.role.code
    if (role == Batch.t_role_code.unassigned)
      throw Error(`not assigned to batch: ${batchId}`)

    const [audio, image, segments, annotations] = await Promise.all([
      Batch.audios(maipl.client, batchId).then(
        (audios) => new Map(audios.map((a) => [a.segment_id, a]))
      ),
      Batch.images(maipl.client, batchId).then(
        (images) => new Map(images.map((i) => [i.segment_id, i]))
      ),
      Batch.segments(maipl.client, batchId),
      Annotation.readSegment(maipl.client, batchId, segmentId),
    ])

    const activeAudio = audio.get(segmentId)
    const activeImage = image.get(segmentId)
    const activeSegment = segments.find((s) => s.id == segmentId)

    if (activeAudio == null) throw Error(`audio not found: ${segmentId}`)
    if (activeImage == null) throw Error(`image not found: ${segmentId}`)
    if (activeSegment == null) throw Error(`segment not found: ${segmentId}`)

    const audioBuffer = await Specviz.Audio.load(activeAudio.audio)

    return {
      batch,
      audio,
      image,
      segments,
      annotations,
      active: {
        audioBuffer,
        audio: activeAudio,
        image: activeImage,
        segment: activeSegment,
      },
      role,
    }
  },
})
