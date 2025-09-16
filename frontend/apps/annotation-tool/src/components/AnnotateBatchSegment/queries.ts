import { Annotation, Batch, type Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as RQ from "@tanstack/react-query"
import * as F from "@maipl/format"
import type { LoaderData } from "./types"

type LoadingProgress = {
  stage: string
  progress: number
}

export const AnnotateBatchSegmentQuery = (
  maipl: MR.t_context,
  batchId: number,
  segmentId: number
) => ({
  queryKey: ["annotate-batch-segment", batchId, segmentId],
  queryFn: async (): Promise<LoaderData> => {
    // Create a progress tracking function
    const updateProgress = (stage: string, progress: number) => {
      const event = new CustomEvent("loading-progress", {
        detail: { stage, progress },
      })
      window.dispatchEvent(event)
    }

    // Load batch data
    updateProgress("Loading batch information...", 20)
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

    // Load audio data
    updateProgress("Loading audio metadata...", 40)
    const audio = await Batch.audios(maipl.client, batchId).then(
      (audios) => new Map(audios.map((a) => [a.segment_id, a]))
    )

    // Load images
    updateProgress("Loading visualization data...", 60)
    const images = await Batch.images(maipl.client, batchId).then((images) => {
      const spectrograms = new Map()
      const waveforms = new Map()

      images.forEach((img) => {
        if (img.image_type === "spectrogram") {
          spectrograms.set(img.segment_id, img)
        } else if (img.image_type === "waveform") {
          waveforms.set(img.segment_id, img)
        }
      })

      return { spectrograms, waveforms }
    })

    // Load segments
    updateProgress("Loading segment information...", 80)
    const segments = await Batch.segments(maipl.client, batchId)

    // Load annotations
    updateProgress("Loading existing annotations...", 90)
    const annotations = await Annotation.readSegment(
      maipl.client,
      batchId,
      segmentId
    )

    const activeAudio = audio.get(segmentId)
    const activeSpectrogram = images.spectrograms.get(segmentId)
    const activeWaveform = images.waveforms.get(segmentId)
    const activeSegment = segments.find((s) => s.id == segmentId)

    if (activeAudio == null) throw Error(`audio not found: ${segmentId}`)
    if (activeSpectrogram == null)
      throw Error(`spectrogram not found: ${segmentId}`)
    if (activeWaveform == null) throw Error(`waveform not found: ${segmentId}`)
    if (activeSegment == null) throw Error(`segment not found: ${segmentId}`)

    // Load audio buffer
    updateProgress("Loading audio data...", 95)
    const audioBuffer = await Specviz.Audio.load(activeAudio.audio)

    // Mark as complete
    updateProgress("Ready", 100)

    return {
      batch,
      audio,
      images,
      segments,
      annotations,
      active: {
        audioBuffer,
        audio: activeAudio,
        spectrogram: activeSpectrogram,
        waveform: activeWaveform,
        segment: activeSegment,
      },
      role,
    }
  },
})
