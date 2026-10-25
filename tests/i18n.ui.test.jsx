/**
 * Component tests for the i18n layer (nav, invoice card, locale switcher).
 * Run with: npm run test:ui
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refreshRef } = vi.hoisted(() => ({ refreshRef: { current: () => {} } }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/marketplace",
  useRouter: () => ({ refresh: () => refreshRef.current() }),
}));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
// Header widgets with their own providers/suites.
vi.mock("@/components/TxActivityButton", () => ({ default: () => null }));
vi.mock("@/components/NotificationBell", () => ({ default: () => null }));

const { default: SiteHeader } = await import("../components/SiteHeader.jsx");
const { default: InvoiceCard } = await import("../components/InvoiceCard.jsx");
const { default: LocaleSwitcher } = await import("../components/LocaleSwitcher.jsx");
const { I18nProvider } = await import("../lib/i18n/I18nProvider.jsx");
const { getDictionary, LOCALE_COOKIE } = await import("../lib/i18n/index.js");

const invoice = {
  id: "INV-1",
  sme: "Acme SA",
  debtor: "Globex",
  status: "open",
  onChain: true,
  amount: 25000,
  currency: "USDC",
  yieldBps: 800,
  dueDate: "2026-12-30",
  fundedAmount: 5000,
};

function readCookieLocale() {
  const m = document.cookie.match(new RegExp(`${LOCALE_COOKIE}=(\\w+)`));
  return m ? m[1] : "en";
}

// Stands in for the server layout: router.refresh() re-reads the cookie and
// re-renders the provider with the new locale/dictionary.
function Harness() {
  const [locale, setLocale] = useState(readCookieLocale());
  refreshRef.current = () => setLocale(readCookieLocale());
  return (
    <I18nProvider locale={locale} dict={getDictionary(locale)}>
      <SiteHeader />
      <InvoiceCard invoice={invoice} />
      <LocaleSwitcher />
    </I18nProvider>
  );
}

beforeEach(() => {
  document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
});
afterEach(cleanup);

describe("i18n components", () => {
  it("renders English by default with en-US formatting", () => {
    render(<Harness />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Marketplace" })).toBeInTheDocument();
    expect(screen.getByText("Face value")).toBeInTheDocument();
    expect(screen.getByText(/25,000 USDC/)).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("en");
  });

  it("switching locale re-renders nav, card labels and formats", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(screen.getByLabelText("Language"), "es");

    expect(document.cookie).toContain(`${LOCALE_COOKIE}=es`);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Mercado" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Enviar factura" })).toBeInTheDocument();
    expect(screen.getByText("Valor nominal")).toBeInTheDocument();
    expect(screen.getByText("Deudor: Globex")).toBeInTheDocument();
    expect(screen.getByText(/25\.000 USDC/)).toBeInTheDocument();
    expect(screen.getByText(/30 dic 2026/)).toBeInTheDocument();
    expect(screen.getByLabelText("Idioma")).toHaveValue("es");
    expect(screen.getByText("Idioma cambiado a Español")).toBeInTheDocument();
  });

  it("locale select is keyboard operable and labelled", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const select = screen.getByRole("combobox", { name: "Language" });
    // Tab order reaches the select (header toggle and links come first).
    let guard = 0;
    while (document.activeElement !== select && guard++ < 20) await user.tab();
    expect(select).toHaveFocus();
    // Native <select>: operable by keyboard in browsers; jsdom does not model
    // arrow-key selection, so assert the change handler path via selectOptions.
    await user.selectOptions(select, "es");
    expect(select).toHaveValue("es");
  });
});
