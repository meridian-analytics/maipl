# <a name="top"></a> @maipl/csv

```ts
function encode<
  Col extends Record<string, string>,
  Row extends { [K in keyof Col]: string | number | boolean },
>(columns: Col, rows: Array<Row>): string
```
