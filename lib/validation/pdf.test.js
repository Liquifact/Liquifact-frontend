import { isValidPdfContent, sanitizeFilename } from './pdf';

describe('isValidPdfContent', () => {
  it('returns true for a file with valid PDF magic bytes', async () => {
    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF-1.4
    const file = new File([content], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: content.length });
    file.slice = (start, end) => {
      const sliced = content.slice(start, end);
      return { arrayBuffer: async () => sliced.buffer, size: sliced.length };
    };
    
    const result = await isValidPdfContent(file);
    expect(result).toBe(true);
  });

  it('returns false for an empty file', async () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 0 });
    file.slice = () => ({ arrayBuffer: async () => new ArrayBuffer(0), size: 0 });
    const result = await isValidPdfContent(file);
    expect(result).toBe(false);
  });

  it('returns false for a file with invalid magic bytes (spoofed MIME)', async () => {
    const content = new Uint8Array(Buffer.from('Hello world, this is a text file'));
    const file = new File([content], 'spoofed.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: content.length });
    file.slice = (start, end) => {
      const sliced = content.slice(start, end);
      return { arrayBuffer: async () => sliced.buffer, size: sliced.length };
    };
    const result = await isValidPdfContent(file);
    expect(result).toBe(false);
  });

  it('returns false if file is less than 5 bytes', async () => {
    const content = new Uint8Array([0x25, 0x50]); // Only %P
    const file = new File([content], 'short.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: content.length });
    file.slice = (start, end) => {
      const sliced = content.slice(start, end);
      return { arrayBuffer: async () => sliced.buffer, size: sliced.length };
    };
    const result = await isValidPdfContent(file);
    expect(result).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('strips control characters', () => {
    const result = sanitizeFilename('test\x00file\nname.pdf');
    expect(result).toBe('testfilename.pdf');
  });

  it('strips HTML tags', () => {
    const result = sanitizeFilename('<script>alert("xss")</script>file.pdf');
    expect(result).toBe('alert("xss")file.pdf');
  });

  it('truncates long filenames and preserves extension', () => {
    const longName = 'a'.repeat(100) + '.pdf';
    const result = sanitizeFilename(longName, 60);
    expect(result.length).toBe(60);
    expect(result.endsWith('.pdf')).toBe(true);
    expect(result).toBe('a'.repeat(56) + '.pdf');
  });

  it('truncates long filenames without extension', () => {
    const longName = 'a'.repeat(100);
    const result = sanitizeFilename(longName, 60);
    expect(result.length).toBe(60);
    expect(result).toBe('a'.repeat(60));
  });

  it('returns default name if empty after sanitization', () => {
    const result = sanitizeFilename('\x00\x00');
    expect(result).toBe('unnamed_file.pdf');
  });
});
