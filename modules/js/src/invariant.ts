export function invariant(
  condition: unknown,
  message?: string,
): asserts condition {
  if (condition) return
  const e = import.meta.env["PROD"]
    ? "Invariant violation"
    : `Invariant violation: ${message ?? "truthy value expected"}`
  throw Error(e)
}

export function invariantEnum<T extends Record<string, string>>(
  value: unknown,
  enum_: T,
  label?: string,
): asserts value is T[keyof T] {
  invariant(
    new Set(Object.values(enum_)).has(value as string),
    `"${value}" is not a member of ${label ?? "enum"}`,
  )
}
