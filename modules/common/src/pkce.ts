// based off Aaron Parekci's example
// https://github.com/aaronpk/pkce-vanilla-js/blob/master/index.html

import { base64urlencode, sha256 } from "./buffer.ts"

/** Pkce.createChallenge: base64-urlencoded sha256 hash for the PKCE challenge */
async function createChallenge(v: string): Promise<string> {
  return base64urlencode(
    new Uint8Array(await sha256(new TextEncoder().encode(v))),
  )
}

/**
 * Pkce.createVerifier:
 * Generate a secure random string using the browser crypto functions
 * length: 43 (min) to 128 (max)
 */
function createVerifier(length = 43): string {
  if (length < 43 || length > 128)
    throw Error("createVerifier: length must be between 43 and 128")
  const bytes = new Uint8Array(length)
  window.crypto.getRandomValues(bytes)
  return base64urlencode(bytes).substring(0, length)
}

export { createChallenge, createVerifier }
