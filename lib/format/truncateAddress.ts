/**
 * Truncates a long address string to head/tail form for display.
 *
 * Addresses shorter than `headLen + tailLen + 1` characters are returned
 * unchanged — no ellipsis is needed.
 *
 * @param address - Full address string (e.g. a Stellar public key).
 * @param headLen - Characters to keep from the start. Defaults to `6`.
 * @param tailLen - Characters to keep from the end. Defaults to `4`.
 * @returns Truncated address string (e.g. `"GABCDE…XYZ9"`), or an empty
 *   string if `address` is falsy or not a string.
 *
 * @example
 * truncateAddress("GABCDE1234567890XYZ9")         // "GABCDE…XYZ9"
 * truncateAddress("GABCDE1234567890XYZ9", 4, 4)   // "GABC…XYZ9"
 * truncateAddress("SHORT")                         // "SHORT"
 * truncateAddress("")                              // ""
 * truncateAddress(null as unknown as string)       // ""
 */
export function truncateAddress(address: string, headLen = 6, tailLen = 4): string {
  if (!address || typeof address !== "string") return "";
  if (address.length <= headLen + tailLen + 1) return address;
  return `${address.slice(0, headLen)}…${address.slice(-tailLen)}`;
}
