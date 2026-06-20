import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UploadZone from './UploadZone';

function createMockFile(name = 'invoice.pdf', type = 'application/pdf') {
  return new File(['mock content'], name, { type });
}

function createMockTextFile(name = 'test.txt') {
  return new File(['mock content'], name, { type: 'text/plain' });
}

function createMockLargeFile(sizeMb = 11) {
  const size = sizeMb * 1024 * 1024;
  return new File([new ArrayBuffer(size)], 'large.pdf', { type: 'application/pdf' });
}

function createDataTransfer(files) {
  return {
    dataTransfer: {
      files,
      items: files.map((file) => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
      })),
      types: ['Files'],
    },
  };
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

  it('shows file info after valid file selection', () => {
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeEnabled();
  });

  it('shows validation error for non-PDF file', () => {
    render(<UploadZone />);

    const file = createMockTextFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid file type/i);
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeDisabled();
  });

  it('shows validation error for oversized file', () => {
    render(<UploadZone />);

    const file = createMockLargeFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/exceeds/);
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeDisabled();
  });

  it('highlights the drop zone during drag-over and clears it on drag-leave', () => {
    render(<UploadZone />);

    const dropZone = screen.getByRole('button', { name: /drop pdf invoice/i });

    fireEvent.dragOver(dropZone);

    expect(dropZone).toHaveClass('border-cyan-400');
    expect(dropZone).toHaveClass('bg-cyan-500/10');

    fireEvent.dragLeave(dropZone);

    expect(dropZone).not.toHaveClass('border-cyan-400');
    expect(dropZone).not.toHaveClass('bg-cyan-500/10');
  });

  it('accepts a PDF dropped on the drop zone and enables submission', () => {
    render(<UploadZone />);

    const file = createMockFile('dragged-invoice.pdf');
    const dropZone = screen.getByRole('button', { name: /drop pdf invoice/i });

    fireEvent.drop(dropZone, createDataTransfer([file]));

    expect(screen.getByText('dragged-invoice.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeEnabled();
  });

  it('rejects an invalid file dropped on the drop zone with an alert', () => {
    render(<UploadZone />);

    const file = createMockTextFile('notes.txt');
    const dropZone = screen.getByRole('button', { name: /drop pdf invoice/i });

    fireEvent.drop(dropZone, createDataTransfer([file]));

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid file type/i);
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeDisabled();
  });

  it('progresses through uploading, tokenizing, and success on submit', async () => {
    mockFetchOk();
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByRole('button', {
      name: /upload & tokenize invoice/i,
    });
    fireEvent.click(submitBtn);

    // uploading state shown immediately
    expect(screen.getByRole('status')).toHaveTextContent('Uploading invoice...');
    expect(submitBtn).toBeDisabled();

    // after fetch resolves → tokenizing then success
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Invoice queued for tokenization. Blockchain confirmation pending.'
      )
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
    fireEvent.click(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    );

    // uploading while fetch is in-flight
    expect(screen.getByRole('status')).toHaveTextContent('Uploading invoice...');

    // let the fetch resolve, which moves to tokenizing
    await act(async () => {
      await Promise.resolve(); // flush microtasks
    });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Invoice uploaded. Pending tokenization...'
      )
    );

    // advance through the tokenization delay
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Invoice queued for tokenization. Blockchain confirmation pending.'
      )
    );
  });

  it('uses role="status" with aria-live for progress announcements', async () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/uploading invoice/i);
  });

  it('prevents double-submission during processing', async () => {
    // keep fetch pending so component stays in uploading
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

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

  it('resets to idle when a new valid file is selected after an error', () => {
    render(<UploadZone />);

    const input = screen.getByLabelText(/select pdf invoice file/i);

    fireEvent.change(input, { target: { files: [createMockTextFile()] } });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [createMockFile()] } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload & tokenize invoice/i })
    ).toBeEnabled();
  });

  it('shows validation error role="alert" with aria-live="assertive"', () => {
    render(<UploadZone />);

    const file = createMockTextFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('shows error and resets to idle when upload fails with server error', async () => {
    mockFetchError(500, 'Internal server error');
    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
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
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
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
