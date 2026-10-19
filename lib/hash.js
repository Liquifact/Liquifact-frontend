export async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hex string (64 chars) -> 32-byte Uint8Array, e.g. for `bind_primary_attestation_hash(BytesN<32>)`. */
export function hexToBytes32(hex) {
  const clean = String(hex).replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) throw new Error("Expected a 64-character hex string (32 bytes)");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
