import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SubmitForm from "@/app/submit/SubmitForm";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import es from "@/lib/i18n/dictionaries/es.js";

vi.mock("@/lib/api", () => ({
  createInvoice: vi.fn(),
}));

const VALID_KEY = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";
const SECRET_KEY = "SA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";

describe("SubmitForm SME Stellar address validation and accessibility", () => {
  async function advanceToTermsStep(user) {
    await user.type(screen.getByLabelText(/Company name/i), "Acme Ltd");
    await user.type(screen.getByLabelText(/Debtor/i), "Globex Corp");
    await user.type(screen.getByLabelText(/Amount/i), "25000");
    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByRole("heading", { name: /Step 2 of 3: Financing terms/i })).toBeInTheDocument();
  }

  it("allows advancing with an empty Stellar wallet address", async () => {
    const user = userEvent.setup();
    render(<SubmitForm />);
    await advanceToTermsStep(user);

    await user.type(screen.getByLabelText(/Due date/i), "2030-01-01");
    const walletInput = screen.getByLabelText(/Stellar wallet \(optional\)/i);
    expect(walletInput).toHaveValue("");
    expect(walletInput).toHaveAttribute("aria-invalid", "false");

    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByRole("heading", { name: /Step 3 of 3: Review & submit/i })).toBeInTheDocument();
  });

  it("allows advancing with a valid Stellar G-address", async () => {
    const user = userEvent.setup();
    render(<SubmitForm />);
    await advanceToTermsStep(user);

    await user.type(screen.getByLabelText(/Due date/i), "2030-01-01");
    const walletInput = screen.getByLabelText(/Stellar wallet \(optional\)/i);
    await user.type(walletInput, VALID_KEY);
    expect(walletInput).toHaveAttribute("aria-invalid", "false");

    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByRole("heading", { name: /Step 3 of 3: Review & submit/i })).toBeInTheDocument();
  });

  it("blocks advancing, sets aria-invalid, and associates error via aria-describedby for invalid G-address", async () => {
    const user = userEvent.setup();
    render(<SubmitForm />);
    await advanceToTermsStep(user);

    await user.type(screen.getByLabelText(/Due date/i), "2030-01-01");
    const walletInput = screen.getByLabelText(/Stellar wallet \(optional\)/i);
    await user.type(walletInput, "GABC");
    await user.click(screen.getByRole("button", { name: /Next/i }));

    // Stays on step 2
    expect(screen.getByRole("heading", { name: /Step 2 of 3: Financing terms/i })).toBeInTheDocument();

    expect(walletInput).toHaveAttribute("aria-invalid", "true");
    const describedBy = walletInput.getAttribute("aria-describedby");
    expect(describedBy).toContain("smeAddress-err");

    const errElement = document.getElementById("smeAddress-err");
    expect(errElement).toBeInTheDocument();
    expect(errElement).toHaveAttribute("role", "alert");
    expect(errElement.textContent).toMatch(/valid Stellar address/i);
  });

  it("rejects secret key (S...) and never echoes the secret key in the error message", async () => {
    const user = userEvent.setup();
    render(<SubmitForm />);
    await advanceToTermsStep(user);

    await user.type(screen.getByLabelText(/Due date/i), "2030-01-01");
    const walletInput = screen.getByLabelText(/Stellar wallet \(optional\)/i);
    await user.type(walletInput, SECRET_KEY);
    await user.click(screen.getByRole("button", { name: /Next/i }));

    expect(screen.getByRole("heading", { name: /Step 2 of 3: Financing terms/i })).toBeInTheDocument();
    expect(walletInput).toHaveAttribute("aria-invalid", "true");

    const errElement = document.getElementById("smeAddress-err");
    expect(errElement).toBeInTheDocument();
    expect(errElement.textContent).not.toContain(SECRET_KEY);
    expect(errElement.textContent).not.toContain("SA7TX");
  });

  it("renders validation errors and step labels in Spanish", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider locale="es" dict={es}>
        <SubmitForm />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: /Paso 1 de 3: Datos de la factura/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Siguiente$/i }));

    expect(screen.getByText("El nombre de la empresa es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("El deudor es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("Introduce un importe positivo")).toBeInTheDocument();
  });
});
