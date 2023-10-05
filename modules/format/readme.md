# <a name="top"></a> @maipl/format

```ts
function filesize(bytes: number): string
function fuzzyTime(date: Date): string
function iso8601(date: Date): string
function safeParseBool(value: unknown, orElse = false): boolean
function safeParseNumber<T>(value: unknown, orElse: T): number | T
function safeParseInteger<T>(value: unknown, orElse: T): number | T
function safeParseString(value: unknown, orElse: string): string
function truncate(s: string, maxLength: number): string
```
