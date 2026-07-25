export function sanitize(value: string | null): string {
  if (!value) return "";
  // Decode percent-encoded components and remove any characters
  // that are not alphanumerics, spaces, hyphens, underscores, commas, or periods.
  try {
    const decoded = decodeURIComponent(value);
    return decoded.replace(/[^\w\s\-.,]/g, "");
  } catch {
    // If decoding fails, fall back to stripping unsafe characters directly.
    return value.replace(/[^\w\s\-.,]/g, "");
  }
}
