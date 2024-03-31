export type t_meta =
  | {
      maipl: "audio"
      channels: number
      duration: number
      sample_rate: number
    }
  | {
      maipl: "annotations"
      batch: number
    }
  | {
      maipl: "detections"
      label?: string
      model: number
      score_min?: number
      score_max?: number
      task: number
    }
  | {
      maipl: "file"
    }

/** Meta.discover: attempt to automatically read meta information */
export async function discover(buffer: ArrayBuffer): Promise<t_meta | null> {
  try {
    const audioContext = new window.AudioContext()
    const audio = await audioContext.decodeAudioData(buffer)
    return {
      maipl: "audio",
      channels: audio.numberOfChannels,
      duration: audio.duration,
      sample_rate: audio.sampleRate,
    }
  } catch (e) {
    // todo: possible mime detection
    return null
  }
}

/** Meta.safeRead: safely retrieve a typed meta value */
export function safeRead<
  K extends t_meta["maipl"],
  U extends Extract<t_meta, { maipl: K }>,
  F extends keyof U,
  R,
>(meta: t_meta, kind: K, field: F, orElse: R): U[F] | R {
  return meta.maipl == kind ? (meta as U)[field] : orElse
}

/** Meta.safeParse: safely parse meta info without raising an exception */
export function safeParse(meta: unknown): t_meta | null {
  try {
    if (meta == null) return null
    if (typeof meta === "object") return { maipl: "audio", ...meta } as t_meta // todo: remove legacy metadata. return {...meta} as t_meta
    if (typeof meta === "string") return JSON.parse(meta) as t_meta
  } catch (e) {
    if (import.meta.env["DEV"]) {
      console.warn("Failed to parse meta", meta, e)
    }
  }
  return null
}
