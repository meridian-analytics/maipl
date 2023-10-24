# <a name="top"></a> @maipl/format

```ts
function filesize(bytes: number): string
function fuzzyTime(date: Date): string
function iso8601(date: Date): string
function safeParseBoolean<T>(value: unknown, orElse: T): boolean | T
function safeParseNumber<T>(value: unknown, orElse: T): number | T
function safeParseInteger<T>(value: unknown, orElse: T, radix?: number): number | T
function safeParseString<T>(value: unknown, orElse: T): string | T
function truncate(s: string, maxLength: number): string
```
