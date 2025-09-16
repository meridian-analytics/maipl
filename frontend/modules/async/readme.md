# <a name="top"></a> @maipl/async

```ts
function retry<T>(
  task: () => Promise<T>,
  retries?: number,
  cooldown?: number,
): Promise<T>

function sleep(ms: number): Promise<void>
function timeout<T>(task: () => Promise<T>, ms: number): Promise<T>

class Pool(threads?: number): {
  add: async <T>(task: () => Promise<T>) => Promise<T>
  size: number
  threads: number
}
```
