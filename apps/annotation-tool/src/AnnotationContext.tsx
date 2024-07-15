import { Annotation, Batch, type Segment } from "@maipl/api"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as R from "react"

type Active = {
  audio: Segment.t_audio
  image: Segment.t_image
  segment: Segment.t
}

type Context = {
  batch: Batch.t
  audio: Map<number, Segment.t_audio>
  image: Map<number, Segment.t_image>
  segments: Segment.t[]
  annotations: Annotation.t[]
  active: Active
  role: Batch.t_role_code
}

const defaultContext: Context = {
  batch: null as unknown as Batch.t,
  audio: new Map(),
  image: new Map(),
  segments: [],
  annotations: [],
  active: null as unknown as Active,
  role: Batch.t_role_code.unassigned,
}

const AnnotationContext = R.createContext(defaultContext)

export function Provider(props: {
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
    queryFn: () => Batch.segments(maipl.client, props.batchId),
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
  // role
  const role =
    batch.data.role == null
      ? batch.data.user_id == maipl.user?.id
        ? Batch.t_role_code.owner
        : Batch.t_role_code.unassigned
      : batch.data.role.code
  if (role == Batch.t_role_code.unassigned) return <p>Not assigned to batch</p>
  // dereference active objects
  const activeAudio = audio.data.get(props.segmentId)
  const activeImage = image.data.get(props.segmentId)
  const activeSegment = segments.data.find(s => s.id == props.segmentId)
  // active objects not found
  if (activeAudio == null) return <p>Audio not found</p>
  if (activeImage == null) return <p>Image not found</p>
  if (activeSegment == null) return <p>Segment not found</p>
  // loaded
  return (
    <AnnotationContext.Provider
      children={props.children}
      value={{
        batch: batch.data,
        audio: audio.data,
        image: image.data,
        segments: segments.data,
        annotations: annotations.data,
        active: {
          audio: activeAudio,
          image: activeImage,
          segment: activeSegment,
        },
        role,
      }}
    />
  )
}

export function useContext() {
  return R.useContext(AnnotationContext)
}
