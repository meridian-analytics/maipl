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
      maipl: "h5_database"
      hdf5_structure: Record<string, Record<string, string>>
      audio_representation_config_id?: number
      total_samples?: number
      groups?: string[]
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

/** Meta.safeReadH5Structure: safely retrieve H5 database structure */
export function safeReadH5Structure(meta: t_meta | null): Record<string, Record<string, string>> | null {
  if (!meta || meta.maipl !== "h5_database") return null
  return meta.hdf5_structure || null
}

/** Meta.safeReadH5Config: safely retrieve H5 database audio config ID */
export function safeReadH5Config(meta: t_meta | null): number | null {
  if (!meta || meta.maipl !== "h5_database") return null
  return meta.audio_representation_config_id || null
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
