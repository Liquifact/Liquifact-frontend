import { StrKey } from "@stellar/stellar-sdk";

/**
 * Validate that a given value is a valid Stellar Ed25519 public key (starts with G).
 * Trims input and rejects non-G addresses, invalid checksums, secret keys, etc.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidPublicKey(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("G")) return false;
  return StrKey.isValidEd25519PublicKey(trimmed);
}
