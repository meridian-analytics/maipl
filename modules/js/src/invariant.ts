export function invariant(
  condition: unknown,
  message?: string,
): asserts condition {
  if (condition) return
  const e = import.meta.env.PROD
    ? "Invariant violation"
    : `Invariant violation: ${message ?? "truthy value expected"}`
  throw Error(e)
}
