const PHI = (1 + Math.sqrt(5)) / 2

export function retry<T>(
  task: () => Promise<T>,
  retries = 3,
  cooldown = PHI * 1000,
): Promise<T> {
  return task().catch((err: unknown) => {
    if (retries <= 0) throw err
    console.warn(`retrying ${retries} more times...`, err)
    return sleep(cooldown).then(() => retry(task, retries - 1, cooldown * PHI))
  })
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function thread() {
  let close: () => void
  return [
    new Promise<void>(r => {
      close = () => r()
    }),
    close!,
  ] as const
}

export function timeout<T>(task: () => Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    task(),
    sleep(ms).then(() => {
      throw Error(`timed out after ${ms} ms`)
    }),
  ])
}

export class Pool {
  private pool: Set<Promise<void>> = new Set()
  private queue: Array<() => void> = []
  private threads: number
  constructor(threads = 4) {
    this.threads = threads
  }
  get size() {
    return this.pool.size
  }
  add = async <T>(task: () => Promise<T>) => {
    return this.open().then(close =>
      Promise.resolve().then(task).finally(close),
    )
  }
  private async open() {
    return this.pool.size < this.threads ? this.deferNow() : this.deferQueued()
  }
  private async deferNow() {
    const [t, close] = thread()
    const p = t.finally(() => {
      this.pool.delete(p)
      this.queue.shift()?.() // todo: shift is O(n)
    })
    this.pool.add(p)
    return close
  }
  private async deferQueued() {
    const [t, close] = thread()
    this.queue.push(close)
    return t.then(_ => this.deferNow())
  }
}
