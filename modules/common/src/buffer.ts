/** Buffer.base64urlencode: Convert bytes to base64url encoding */
function base64urlencode(bytes: Uint8Array): string {
  // base64 encode bytes as ascii 0-255
  try {
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-") // replace + with -
      .replace(/\//g, "_") // replace / with _
      .replace(/=+$/, "") // remove trailing =
  } catch (e) {
    throw Error("Buffer.base64urlencode: buffer too long")
  }
}

/** hexDigest: Convert an ArrayBuffer to a hex string */
function hexDigest(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), b =>
    b.toString(16).padStart(2, "0"),
  ).join("")
}

/** sha256: Compute the SHA256 hash of an ArrayBuffer */
function sha256(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  return window.crypto.subtle.digest("SHA-256", bytes)
}

export { base64urlencode, hexDigest, sha256 }
