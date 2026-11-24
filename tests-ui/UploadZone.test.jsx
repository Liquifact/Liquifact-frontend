import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import UploadZone from "@/components/UploadZone";

const PDF = "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n";

function pdfFile(name = "invoice.pdf", type = "application/pdf", body = PDF) {
  return new File([body], name, { type });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("UploadZone", () => {
  it("exposes a keyboard-activatable drop zone with instructions", async () => {
    const user = userEvent.setup();
    render(<UploadZone value={null} onChange={() => {}} />);
    const zone = screen.getByRole("button", { name: /drop pdf invoice here/i });
    expect(zone).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("note", { name: /file upload requirements/i })).toBeInTheDocument();

    const input = screen.getByLabelText(/choose a pdf invoice file/i);
    const click = vi.spyOn(input, "click").mockImplementation(() => {});
    await user.tab();
    expect(zone).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(click).toHaveBeenCalledOnce();
  });

  it("rejects a non-PDF file with an assertive alert and never reports metadata", async () => {
    const onChange = vi.fn();
    render(<UploadZone value={null} onChange={onChange} />);
    const input = screen.getByLabelText(/choose a pdf invoice file/i);
    fireEvent.change(input, { target: { files: [new File(["hello"], "invoice.txt", { type: "text/plain" })] } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Invalid file type/i);
    expect(onChange).toHaveBeenCalledWith(null);
    expect(onChange.mock.calls.every(([value]) => value === null)).toBe(true);
  });

  it("validates a PDF, reports only metadata and shows the fingerprint", async () => {
    const digest = vi.fn(async () => new Uint8Array(32).fill(7).buffer);
    vi.stubGlobal("crypto", { subtle: { digest } });
    const onChange = vi.fn();
    render(<UploadZone value={null} onChange={onChange} />);
    const input = screen.getByLabelText(/choose a pdf invoice file/i);
    const file = pdfFile();
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: "invoice.pdf", size: file.size })));
    const metadata = onChange.mock.calls.at(-1)[0];
    expect(metadata.sha256).toBe("07".repeat(32));
    expect(Object.keys(metadata).sort()).toEqual(["name", "sha256", "size"]);
    expect(digest).toHaveBeenCalledWith("SHA-256", expect.anything());

    cleanup();
    render(<UploadZone value={metadata} onChange={() => {}} />);
    expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
    expect(screen.getByText(metadata.sha256)).toBeInTheDocument();
  });

  it("accepts a dropped PDF and clears stale state when hashing fails", async () => {
    vi.stubGlobal("crypto", { subtle: { digest: vi.fn(async () => { throw new Error("digest failed"); }) } });
    const onChange = vi.fn();
    render(<UploadZone value={null} onChange={onChange} />);
    const zone = screen.getByRole("button", { name: /drop pdf invoice here/i });

    fireEvent.drop(zone, { dataTransfer: { files: [pdfFile()] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not compute the file fingerprint/i);
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText("invoice.pdf")).not.toBeInTheDocument();
  });

  it("removes the attached fingerprint and returns focus to the drop zone", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<UploadZone value={{ name: "invoice.pdf", size: 1024, sha256: "a".repeat(64) }} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /remove file/i }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole("button", { name: /drop a new pdf invoice here/i })).toHaveFocus();
  });
});
