function encodeValue(s: string): string {
  return `"${s.replace(/"/g, `""`)}"`
}

function encodeLine(a: Array<string>): string {
  return a.map(encodeValue).join(",")
}

function encode<
  Col extends Record<string, string>,
  Row extends { [K in keyof Col]: string | number | boolean },
>(columns: Col, rows: Array<Row>) {
  return [encodeLine(Object.values(columns))]
    .concat(
      rows.map(o => encodeLine(Object.keys(columns).map(k => String(o[k])))),
    )
    .join("\n")
}

export { encode }
