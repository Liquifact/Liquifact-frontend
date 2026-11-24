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
// Funding-flow suite (#1462): keep it offline and deterministic. Stellar RPC,
// the API client and the per-invoice side panels are stubbed so only the
// localized funding UI renders.
const { rpcMock, apiMock } = vi.hoisted(() => ({
  rpcMock: {
    fetchContribution: vi.fn(async () => 25_000_000n),
    fetchIsRefunded: vi.fn(async () => false),
    fetchLegalHold: vi.fn(async () => false),
    fetchIsPaused: vi.fn(async () => false),
  },
  apiMock: { getInvoice: vi.fn(), fundInvoice: vi.fn() },
}));
vi.mock("@/lib/stellar/rpc.js", () => ({
  ...rpcMock,
  simulateCall: vi.fn(),
  addressArg: vi.fn(),
  i128Arg: vi.fn(),
  buildSignSubmit: vi.fn(),
  buildRefundArgs: vi.fn(() => []),
  buildUnfundArgs: vi.fn(() => []),
  extractSimError: vi.fn(() => null),
}));
vi.mock("@/lib/stellar/trustline.js", () => ({ addTrustline: vi.fn() }));
vi.mock("@/lib/api", () => ({ getInvoice: apiMock.getInvoice, fundInvoice: apiMock.fundInvoice }));
vi.mock("@/components/NotificationsProvider", () => ({
  useNotifications: () => ({ follow: vi.fn(), unfollow: vi.fn(), isFollowing: () => false }),
}));
// Escrow token resolves to the native XLM SAC, matching the invoice currency.
vi.mock("@/lib/escrow/token", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveFundingToken: vi.fn(async () => "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"),
}));
vi.mock("@/lib/stellar/freighter", async (importOriginal) => ({
  ...(await importOriginal()),
  getWalletAddress: vi.fn(async () => null),
}));
vi.mock("@/components/wallet/BalanceHint", () => ({ default: () => null }));
vi.mock("@/components/escrow/FundersTable", () => ({ default: () => null }));
vi.mock("@/components/invest/ExitPanel", () => ({ default: () => null }));
vi.mock("@/app/marketplace/[id]/ActivityFeed", () => ({ default: () => null }));
vi.mock("@/components/sme/SmeActionsCard", () => ({ default: () => null }));

const { default: SiteHeader } = await import("../components/SiteHeader.jsx");
const { default: InvoiceCard } = await import("../components/InvoiceCard.jsx");
const { default: LocaleSwitcher } = await import("../components/LocaleSwitcher.jsx");
const { I18nProvider } = await import("../lib/i18n/I18nProvider.jsx");
const { getDictionary, LOCALE_COOKIE } = await import("../lib/i18n/index.js");
const { default: InvoiceDetail } = await import("../app/marketplace/[id]/InvoiceDetail.jsx");
const { default: EscrowRules } = await import("../components/escrow/EscrowRules.jsx");
// The page mocks ExitPanel; import the real component for its own Spanish assertions.
const { default: ExitPanel } = await vi.importActual("../components/invest/ExitPanel.jsx");

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

const XLM = 10_000_000n;
const onChainInvoice = {
  id: "INV-ES-1",
  sme: "Acme SA",
  debtor: "Globex",
  status: "open",
  onChain: true,
  amount: 1000,
  fundedAmount: 300,
  currency: "XLM",
  yieldBps: 800,
  dueDate: "2026-12-30",
};
const openRules = {
  minContributionFloor: 10n * XLM,
  maxPerInvestorCap: 400n * XLM,
  remainingCapacity: 700n * XLM,
  fundingDeadline: null,
  paused: false,
  legalHold: false,
  status: 0,
  contribution: 0n,
  errors: [],
};

function renderEs(ui) {
  return render(
    <I18nProvider locale="es" dict={getDictionary("es")}>
      {ui}
    </I18nProvider>,
  );
}

describe("i18n funding flow (es)", () => {
  it("renders the invoice detail funding labels in Spanish", async () => {
    apiMock.getInvoice.mockResolvedValue({ data: onChainInvoice, offline: false });
    renderEs(<InvoiceDetail id="INV-ES-1" loadConstraintsFn={vi.fn().mockResolvedValue(openRules)} />);

    expect(await screen.findByRole("heading", { name: "Financiar esta factura" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Condiciones" })).toBeInTheDocument();
    expect(screen.getByText("Deudor: Globex")).toBeInTheDocument();
    expect(screen.getByText("Rendimiento del inversor")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto (XLM)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar Freighter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Firmar y financiar" })).toBeInTheDocument();
    // Escrow rules + token check render inside the funding flow once loaded.
    expect(await screen.findByText("Reglas del depósito en garantía")).toBeInTheDocument();
    expect(screen.getByText("Contribución mínima")).toBeInTheDocument();
    expect(screen.getByText("Abierto a financiación")).toBeInTheDocument();
    expect(await screen.findByText(/Paga en XLM \(nativo\) · verificado on-chain/)).toBeInTheDocument();
    // No English funding copy leaks through.
    expect(screen.queryByText("Fund this invoice")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign & fund" })).toBeNull();
  });

  it("localizes the closed-invoice notice", async () => {
    apiMock.getInvoice.mockResolvedValue({ data: { ...onChainInvoice, status: "cancelled" }, offline: false });
    renderEs(<InvoiceDetail id="INV-ES-1" loadConstraintsFn={vi.fn().mockResolvedValue(openRules)} />);
    const notice = await screen.findByText(/consulta tus opciones de salida/);
    expect(notice).toHaveTextContent("Esta factura está cancelada: consulta tus opciones de salida a continuación.");
  });

  it("localizes escrow constraint blockers on the fund button", async () => {
    apiMock.getInvoice.mockResolvedValue({ data: onChainInvoice, offline: false });
    renderEs(<InvoiceDetail id="INV-ES-1" loadConstraintsFn={vi.fn().mockResolvedValue({ ...openRules, paused: true })} />);
    const btn = await screen.findByRole("button", { name: "La financiación está pausada en este depósito en garantía." });
    expect(btn).toBeDisabled();
  });

  it("keeps {var} placeholders and plurals in escrow rules", () => {
    const now = Date.now();
    renderEs(
      <EscrowRules
        constraints={{ ...openRules, maxPerInvestorCap: null, fundingDeadline: Math.floor(now / 1000) + 3 * 86400 + 60 }}
        currency="XLM"
      />,
    );
    expect(screen.getByText("Sin límite")).toBeInTheDocument();
    expect(screen.getByText("Plazo de financiación")).toBeInTheDocument();
    expect(screen.getByText(/UTC \(en 3 días/)).toBeInTheDocument();
  });

  it("renders the exit panel refund copy in Spanish", async () => {
    renderEs(<ExitPanel investorAddress="GABC" invoiceStatus="cancelled" onContribRefresh={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Solicitar reembolso" })).toBeInTheDocument();
    expect(screen.getByText(/puede reembolsarse/)).toHaveTextContent(
      "Tu contribución de 2.5 XLM puede reembolsarse: este depósito en garantía fue cancelado.",
    );
  });
});
