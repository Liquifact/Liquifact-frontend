import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UploadZone from './UploadZone';

function createMockFile(name = 'invoice.pdf', type = 'application/pdf') {
  const content = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF-1.4
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'size', { value: content.length });
  file.slice = (start, end) => {
    const sliced = content.slice(start, end);
    return { arrayBuffer: async () => sliced.buffer, size: sliced.length };
  };
  return file;
}

function createMockTextFile(name = 'test.txt') {
  const content = new Uint8Array(Buffer.from('mock content'));
  const file = new File([content], name, { type: 'text/plain' });
  Object.defineProperty(file, 'size', { value: content.length });
  file.slice = (start, end) => {
    const sliced = content.slice(start, end);
    return { arrayBuffer: async () => sliced.buffer, size: sliced.length };
  };
  return file;
}

function createMockLargeFile(sizeMb = 11) {
  const size = sizeMb * 1024 * 1024;
  const content = new Uint8Array(size);
  content.set([0x25, 0x50, 0x44, 0x46, 0x2D], 0);
  const file = new File([content], 'large.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: content.length });
  file.slice = (start, end) => {
    const sliced = content.slice(start, end);
    return { arrayBuffer: async () => sliced.buffer, size: sliced.length };
  };
  return file;
}

function createMockSpoofedFile() {
  const content = new Uint8Array(Buffer.from('this is not a pdf file but an image maybe'));
  const file = new File([content], 'spoofed.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: content.length });
  file.slice = (start, end) => {
    const sliced = content.slice(start, end);
    return { arrayBuffer: async () => sliced.buffer, size: sliced.length };
  };
  return file;
}

function createMockEmptyFile() {
  const file = new File([], 'empty.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: 0 });
  file.slice = () => ({ arrayBuffer: async () => new ArrayBuffer(0), size: 0 });
  return file;
}

function createMockLongNameFile() {
  const name = 'a'.repeat(100) + '.pdf';
  return createMockFile(name);
}

function mockFetchOk(extra = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(extra),
  });
}

function mockFetchError(status = 500, message = 'Server error') {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({ message }),
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('UploadZone', () => {
  it('renders constraint notice and drop zone in idle state', () => {
    render(<UploadZone />);

    expect(
      screen.getByRole('note', { name: /file upload requirements/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /drop pdf invoice/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeDisabled();
  });

  it('shows file info after valid file selection', async () => {
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeEnabled();
  });

  it('shows validation error for non-PDF file', async () => {
    render(<UploadZone />);

    const file = createMockTextFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/invalid file type/i));
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeDisabled();
  });

  it('shows validation error for oversized file', async () => {
    render(<UploadZone />);

    const file = createMockLargeFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/exceeds/));
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeDisabled();
  });
  
  it('shows validation error for spoofed PDF file (valid extension/MIME but invalid bytes)', async () => {
    render(<UploadZone />);

    const file = createMockSpoofedFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not match a valid PDF document/));
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeDisabled();
  });

  it('shows validation error for zero-byte file', async () => {
    render(<UploadZone />);

    const file = createMockEmptyFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/File is empty/));
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeDisabled();
  });

  it('sanitizes and truncates long filenames for display', async () => {
    render(<UploadZone />);

    const file = createMockLongNameFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    const expectedName = 'a'.repeat(56) + '.pdf';
    await waitFor(() => expect(screen.getByText(expectedName)).toBeInTheDocument());
  });

  it('progresses through uploading, tokenizing, and success on submit', async () => {
    mockFetchOk();
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());

    const submitBtn = screen.getByRole('button', {
      name: /upload & tokenize invoice/i,
    });
    fireEvent.click(submitBtn);

    // uploading state shown immediately
    expect(screen.getByRole('status')).toHaveTextContent(/uploading invoice/i);
    expect(submitBtn).toBeDisabled();

    // after fetch resolves → tokenizing then success
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/queued for tokenization/i)
    );
    expect(submitBtn).toBeEnabled();
  });

  it('shows tokenizing status between upload and success when server returns tokenizationDelay', async () => {
    // fetch resolves with a tokenizationDelay so the component briefly enters tokenizing
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ tokenizationDelay: 1000 }),
    });

    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
    
    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());
    
    fireEvent.click(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    );

    // uploading while fetch is in-flight
    expect(screen.getByRole('status')).toHaveTextContent(/uploading invoice/i);

    // let the fetch resolve, which moves to tokenizing
    await act(async () => {
      await Promise.resolve(); // flush microtasks
    });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/pending tokenization/i)
    );

    // advance through the tokenization delay
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/queued for tokenization/i)
    );
  });

  it('uses role="status" with aria-live for progress announcements', async () => {
    mockFetchOk();
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/uploading invoice/i);

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/queued for tokenization/i)
    );
  });

  it('prevents double-submission during processing', async () => {
    // keep fetch pending so component stays in uploading
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());

    const submitBtn = screen.getByRole('button', {
      name: /upload & tokenize invoice/i,
    });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(/uploading invoice/i);
  });

  it('opens file dialog on Enter key on the drop zone', () => {
    render(<UploadZone />);

    const dropZone = screen.getByRole('button', { name: /drop pdf invoice/i });
    const input = screen.getByLabelText(/select pdf invoice file/i);
    const clickSpy = jest.spyOn(input, 'click').mockImplementation(() => {});

    fireEvent.keyDown(dropZone, { key: 'Enter', code: 'Enter' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it('opens file dialog on Space key on the drop zone', () => {
    render(<UploadZone />);

    const dropZone = screen.getByRole('button', { name: /drop pdf invoice/i });
    const input = screen.getByLabelText(/select pdf invoice file/i);
    const clickSpy = jest.spyOn(input, 'click').mockImplementation(() => {});

    fireEvent.keyDown(dropZone, { key: ' ', code: 'Space' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it('resets to idle when a new valid file is selected after an error', async () => {
    render(<UploadZone />);

    const input = screen.getByLabelText(/select pdf invoice file/i);

    fireEvent.change(input, { target: { files: [createMockTextFile()] } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    fireEvent.change(input, { target: { files: [createMockFile()] } });

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeEnabled();
  });

  it('shows validation error role="alert" with aria-live="assertive"', async () => {
    render(<UploadZone />);

    const file = createMockTextFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive'));
  });

  it('shows error and resets to idle when upload fails with server error', async () => {
    mockFetchError(500, 'Internal server error');
    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
    
    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());
    
    fireEvent.click(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/internal server error/i)
    );
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeEnabled();
  });

  it('shows error and resets to idle when fetch throws (network failure)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
    
    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());
    
    fireEvent.click(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i)
    );
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeEnabled();
  });

  it('sends a POST request to /invoices with the file as FormData', async () => {
    mockFetchOk();
    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
    
    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());
    
    fireEvent.click(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/invoices$/);
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('invoice')).toBe(file);
  });
});
