/**
 * Verifies that a file contains the PDF magic bytes (%PDF-).
 * Reads only the first 5 bytes to avoid loading the entire file into memory.
 * 
 * @param {File} file - The file to validate.
 * @returns {Promise<boolean>} True if the file starts with %PDF-
 */
export async function isValidPdfContent(file) {
  if (!file || file.size === 0) return false;
  
  // PDF magic bytes: %PDF-
  const magicBytes = [0x25, 0x50, 0x44, 0x46, 0x2D];
  
  try {
    const slice = file.slice(0, 5);
    const arrayBuffer = await slice.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    if (uint8Array.length < 5) return false;
    
    for (let i = 0; i < 5; i++) {
      if (uint8Array[i] !== magicBytes[i]) {
        return false;
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Sanitizes a filename by stripping control characters, HTML tags, and null bytes.
 * Truncates the result to a maximum length.
 * 
 * @param {string} name - The original filename
 * @param {number} [maxLength=60] - The maximum allowed length
 * @returns {string} The sanitized filename
 */
export function sanitizeFilename(name, maxLength = 60) {
  if (!name || typeof name !== 'string') return 'unnamed_file.pdf';
  
  let safeName = name
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove basic HTML tags (just in case they're parsed anywhere, though React escapes)
    .replace(/<[^>]*>/g, '')
    // Trim whitespace
    .trim();
    
  if (!safeName) safeName = 'unnamed_file.pdf';
  
  if (safeName.length > maxLength) {
    // try to preserve extension
    const extMatch = safeName.match(/(\.[^.]+)$/);
    if (extMatch) {
      const ext = extMatch[1];
      const maxBaseLength = maxLength - ext.length;
      if (maxBaseLength > 0) {
        safeName = safeName.substring(0, maxBaseLength) + ext;
      } else {
        safeName = safeName.substring(0, maxLength);
      }
    } else {
      safeName = safeName.substring(0, maxLength);
    }
  }
  
  return safeName;
}
