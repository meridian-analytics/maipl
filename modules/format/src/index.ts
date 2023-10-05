const units = ["B", "KB", "MB", "GB", "TB"]

export function filesize(bytes: number): string {
  function loop(bytes: number, i: number): string {
    return bytes > 1000
      ? loop(bytes / 1000, i + 1)
      : `${bytes.toFixed(1)} ${units[i]}`
  }
  return loop(bytes, 0)
}

export function fuzzyTime(date: Date): string {
  const pluralize = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`
  const delta = new Date().getTime() - date.getTime()
  const second = 1000
  const minute = second * 60
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const month = day * 30
  if (delta < minute) {
    return "just now"
  }
  if (delta < hour) {
    const minutes = Math.floor(delta / minute)
    return `${pluralize(minutes, "minute")} ago`
  }
  if (delta < day) {
    const hours = Math.floor(delta / hour)
    return `${pluralize(hours, "hour")} ago`
  }
  if (delta < week) {
    const days = Math.floor(delta / day)
    return `${pluralize(days, "day")} ago`
  }
  if (delta < month) {
    const weeks = Math.floor(delta / week)
    return `${pluralize(weeks, "week")} ago`
  }
  return iso8601(date)
}

export function iso8601(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function safeParseBool(value: unknown, orElse = false): boolean {
  return value == null
    ? orElse
    : String(value).toLowerCase() == "true" || String(value) == "1"
}

export function safeParseNumber<T>(value: unknown, orElse: T): number | T {
  const n = Number(value)
  return isNaN(n) ? orElse : n
}

export function safeParseInteger<T>(value: unknown, orElse: T): number | T {
  return /^\d+$/.test(String(value)) ? Number(value) : orElse
}

export function safeParseString(value: unknown, orElse: string): string {
  return value == null || String(value) == "" ? orElse : String(value)
}

export function truncate(s: string, maxLength: number) {
  const half = Math.floor(maxLength / 2)
  return s.length > maxLength ? s.slice(0, half) + "…" + s.slice(-half) : s
}
