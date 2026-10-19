import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createInvoice = vi.fn();
vi.mock("@/lib/api", () => ({ createInvoice: (p) => createInvoice(p) }));
vi.mock("next/link", () => ({ default: ({ children, ...p }) => <a {...p}>{children}</a> }));

import SubmitForm from "@/app/submit/SubmitForm";

beforeEach(() => {
  process.env.NEXT_PUBLIC_UPLOADS_MODE = "mock";
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
  createInvoice.mockResolvedValue({ data: { id: "inv_1" } });
});

describe("SubmitForm", () => {
  it("sends documentSha256 in the createInvoice payload", async () => {
    const user = userEvent.setup();
    render(<SubmitForm />);
    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText(/Debtor/), { target: { value: "Globex" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2030-01-01" } });
    const file = new File(["%PDF-1.4\n%%EOF\n"], "inv.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Choose file"), file);
    await screen.findByTestId("digest");
    await user.click(screen.getByRole("button", { name: "Submit invoice" }));
    await waitFor(() => expect(createInvoice).toHaveBeenCalled());
    const payload = createInvoice.mock.calls[0][0];
    expect(payload.documentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(payload.documentId).toBeUndefined(); // mock uploads don't send documentId
  });
});
