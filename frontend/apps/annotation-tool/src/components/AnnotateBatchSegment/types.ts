import { Annotation, Batch, type Segment } from "@maipl/api"
import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"

export type LoaderData = {
  batch: Batch.t
  audio: Map<number, Segment.t_audio>
  image: Map<number, Segment.t_image>
  segments: Segment.t[]
  annotations: Annotation.t[]
  active: {
    audio: Segment.t_audio
    audioBuffer: AudioBuffer
    image: Segment.t_image
    segment: Segment.t
  }
  role: Batch.t_role_code
}
