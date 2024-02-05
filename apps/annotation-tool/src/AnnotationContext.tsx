import { Annotation, Batch, Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as R from "react"

type Context = {
  batch: Batch.t
  audio: Map<number, Segment.t_audio>
  image: Map<number, Segment.t_image>
  segments: Segment.t[]
  annotations: Annotation.t[]
  active: {
    audio?: Segment.t_audio
    image?: Segment.t_image
    segment?: Segment.t
  }
}

const defaultContext: Context = {
  batch: undefined as unknown as Batch.t,
  audio: new Map(),
  image: new Map(),
  segments: [],
  annotations: [],
  active: {},
}

const AnnotationContext = R.createContext(defaultContext)

export function AnnotationContextProvider(props: {
  batchId: number
  segmentId: number
  children: R.ReactNode
}) {
  const maipl = MR.useMaipl()
  const batch = RQ.useQuery({
    queryKey: ["batches", props.batchId],
    queryFn: () => Batch.get(maipl.client, props.batchId),
  })
  const audio = RQ.useQuery({
    initialData: [],
    queryKey: ["batches", props.batchId, "audios"],
    queryFn: () => Batch.audios(maipl.client, props.batchId),
    select: audios => new Map(audios.map(a => [a.segment_id, a])),
  })
  const image = RQ.useQuery({
    initialData: [],
    queryKey: ["batches", props.batchId, "images"],
    queryFn: () => Batch.images(maipl.client, props.batchId),
    select: images => new Map(images.map(i => [i.segment_id, i])),
  })
  const segments = RQ.useQuery({
    initialData: [],
    enabled: batch.data != null,
    queryKey: ["batches", props.batchId, "segments"],
    queryFn: () =>
      // todo: change to
      // Batch.segments(maipl.client, props.batchId)
      Segment.list(maipl.client, {
        ids: batch.data!.segments,
      }).then(r => r.data),
  })
  const annotations = RQ.useQuery({
    initialData: [],
    queryKey: ["regions", props.segmentId],
    queryFn: () =>
      Annotation.readSegment(maipl.client, props.batchId, props.segmentId),
  })
  // fetching
  if (
    batch.isFetching ||
    segments.isFetching ||
    audio.isFetching ||
    image.isFetching ||
    annotations.isFetching
  )
    return <p>Loading...</p>
  // error
  if (batch.error) return <p>Error: {batch.error.message}</p>
  if (audio.error) return <p>Error: {audio.error.message}</p>
  if (image.error) return <p>Error: {image.error.message}</p>
  if (segments.error) return <p>Error: {segments.error.message}</p>
  if (annotations.error) return <p>Error: {annotations.error.message}</p>
  // validation
  if (batch.data == null) return <p>Batch not found</p>
  if (audio.data.size == 0) return <p>Audios not found</p>
  if (image.data.size == 0) return <p>Images not found</p>
  if (segments.data.length == 0) return <p>Segments not found</p>

  // loaded
  return (
    <AnnotationContext.Provider
      value={{
        batch: batch.data,
        audio: audio.data,
        image: image.data,
        segments: segments.data,
        annotations: annotations.data,
        active: {
          audio: audio.data.get(props.segmentId),
          image: image.data.get(props.segmentId),
          segment: segments.data.find(s => s.id == props.segmentId),
        },
      }}
      children={props.children}
    />
  )
}

export function useAnnotationContext() {
  return R.useContext(AnnotationContext)
}
