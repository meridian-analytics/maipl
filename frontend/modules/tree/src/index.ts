import * as F from "@maipl/format"

export type Tree = Map<string, Tree> | null

export function insert(tree: Tree, path: Array<string>): Tree {
  return path.length == 0
    ? null
    : new Map(tree ?? new Map()).set(
        path[0],
        insert(tree?.get(path[0]) ?? null, path.slice(1)),
      )
}

export function fromPaths(paths: Array<string>) {
  return paths
    .sort((a, b) => a.localeCompare(b))
    .reduce((root, path) => insert(root, path.split("/")), null as Tree)
}

export function toString(tree: Tree, maxLength = 40) {
  function* gen(t: Tree): Generator<string> {
    if (t == null) return
    for (const [key, value] of t) {
      yield "/" + F.truncate(key, maxLength)
      for (const line of gen(value)) yield "    " + line
    }
  }
  return Array.from(gen(tree?.get("") ?? null))
    .join("\n")
    .trim()
}
