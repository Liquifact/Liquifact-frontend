import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadZone from "@/components/upload/UploadZone";

const VALID = "%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n";
const pdf = (body = VALID, name = "inv.pdf") => new File([body], name, { type: "application/pdf" });

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});

describe("UploadZone", () => {
  it("selects a file via the keyboard-reachable input and shows the digest", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<UploadZone onChange={onChange} />);
    const input = screen.getByLabelText("Choose file");
    await user.tab();
    expect(input).toHaveFocus();
    await user.upload(input, pdf());
    expect(await screen.findByTestId("digest")).toHaveTextContent(/^[0-9a-f]{64}$/);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ sha256: expect.stringMatching(/^[0-9a-f]{64}$/) }));
  });

  it("accepts a dropped file", async () => {
    render(<UploadZone onChange={() => {}} />);
    const zone = screen.getByText(/Drag a PDF here/).parentElement;
    fireEvent.drop(zone, { dataTransfer: { files: [pdf()] } });
    expect(await screen.findByTestId("digest")).toBeInTheDocument();
  });

  it("shows validation errors in an alert", async () => {
    render(<UploadZone onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("Choose file"), { target: { files: [pdf("not a pdf")] } });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/%PDF-/);
  });

  it("revokes the object URL on remove", async () => {
    const user = userEvent.setup();
    render(<UploadZone onChange={() => {}} />);
    await user.upload(screen.getByLabelText("Choose file"), pdf());
    await screen.findByTestId("digest");
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test"));
  });
});
