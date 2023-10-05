import * as F from "../format.ts"

type Tree = Map<string, Tree> | null

function treeInsert(tree: Tree, path: Array<string>): Tree {
  return path.length == 0
    ? null
    : new Map(tree ?? new Map()).set(
        path[0],
        treeInsert(tree?.get(path[0]) ?? null, path.slice(1)),
      )
}
function treeFromPaths(paths: Array<string>) {
  return paths
    .sort((a, b) => a.localeCompare(b))
    .reduce((root, path) => treeInsert(root, path.split("/")), null as Tree)
}

function treeToString(tree: Tree, maxLength = 40) {
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

export { type Tree, treeFromPaths, treeInsert, treeToString }
