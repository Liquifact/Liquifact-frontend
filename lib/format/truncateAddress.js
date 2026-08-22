/**
 * Truncates a long address string to head/tail form for display.
 *
 * Example: "GABCDE1234…XYZ9"  (headLen=6, tailLen=4)
 *
 * Addresses shorter than headLen + tailLen + 1 characters are returned
 * unchanged — no ellipsis is needed.
 *
 * @param {string}  address           - Full address string.
 * @param {number}  [headLen=6]       - Characters to keep from the start.
 * @param {number}  [tailLen=4]       - Characters to keep from the end.
 * @returns {string} Truncated address, or the original if short enough.
 */
export function truncateAddress(address, headLen = 6, tailLen = 4) {
  if (!address || typeof address !== "string") return "";
  if (address.length <= headLen + tailLen + 1) return address;
  return `${address.slice(0, headLen)}…${address.slice(-tailLen)}`;
}
