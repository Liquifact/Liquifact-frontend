import { render, screen, cleanup } from "@testing-library/react";
import assert from "node:assert/strict";
import { afterEach, describe, expect, it } from "vitest";
import FundingProgress from "../components/FundingProgress.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { I18nProvider } from "../lib/i18n/I18nProvider.jsx";
import { getDictionary } from "../lib/i18n/index.js";

afterEach(cleanup);

describe("FundingProgress", () => {
  it.each([
    [0, 25000, 0, "0% funded, 0 of 25,000 USDC"],
    [18000, 25000, 72, "72% funded, 18,000 of 25,000 USDC"],
    [25000, 25000, 100, "100% funded, 25,000 of 25,000 USDC"],
    [120, 100, 100, "100% funded, 120 of 100 USDC"],
    [500, 0, 0, "0% funded, 500 of 0 USDC"],
  ])("exposes %s of %s with value %s", (funded, target, percent, valueText) => {
    render(<FundingProgress funded={funded} target={target} currency="USDC" />);
    const progress = screen.getByRole("progressbar");

    assert.equal(progress.getAttribute("aria-valuemin"), "0");
    assert.equal(progress.getAttribute("aria-valuemax"), "100");
    assert.equal(progress.getAttribute("aria-valuenow"), String(percent));
    assert.equal(progress.getAttribute("aria-valuetext"), valueText);
  });

  it("renders the value as an optional visible label", () => {
    render(<FundingProgress funded={18000} target={25000} currency="USDC" showLabel />);
    assert.ok(screen.getByText("72% funded, 18,000 of 25,000 USDC"));
  });

  it("localizes the value and numbers in es", () => {
    render(
      <I18nProvider locale="es" dict={getDictionary("es")}>
        <FundingProgress funded={18000.5} target={25000} currency="USDC" showLabel />
      </I18nProvider>,
    );
    const valueText = "72% financiado, 18.000,5 de 25.000 USDC";
    assert.equal(screen.getByRole("progressbar").getAttribute("aria-valuetext"), valueText);
    assert.ok(screen.getByText(valueText));
  });

  it("falls back to English outside an I18nProvider", () => {
    render(<FundingProgress funded={18000} target={25000} currency="USDC" />);
    assert.equal(
      screen.getByRole("progressbar").getAttribute("aria-valuetext"),
      "72% funded, 18,000 of 25,000 USDC",
    );
  });
});

describe("StatusBadge", () => {
  it.each([
    ["open", "Open"],
    ["funded", "Funded"],
    ["settled", "Settled"],
    ["withdrawn", "Withdrawn"],
    [3, "Withdrawn"],
    ["cancelled", "Cancelled"],
    ["future-state", "Unknown"],
  ])("renders %s as %s with a hidden icon", (status, label) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByLabelText(`Status: ${label}`);

    assert.ok(badge.textContent.includes(label));
    assert.ok(badge.querySelector("[aria-hidden='true']"));
  });

  it("announces a live status update politely", () => {
    render(<StatusBadge status="funded" live />);
    assert.equal(screen.getByRole("status", { name: "Status: Funded" }).getAttribute("aria-live"), "polite");
  });

  it("uses the shared badge primitive for on-chain state", () => {
    render(<StatusBadge kind="chain" />);
    assert.ok(screen.getByLabelText("Status: On-chain").textContent.includes("On-chain"));
  });

  it("allows overriding the translated label via the label prop", () => {
    render(
      <I18nProvider locale="es" dict={getDictionary("es")}>
        <StatusBadge status="open" label="Custom" />
      </I18nProvider>,
    );
    const badge = screen.getByLabelText("Estado: Custom");
    assert.ok(badge.textContent.includes("Custom"));
  });

  it.each([
    ["open", "Open"],
    ["funded", "Funded"],
    ["settled", "Settled"],
    ["withdrawn", "Withdrawn"],
    ["cancelled", "Cancelled"],
    ["unknown-state", "Unknown"],
  ])("renders %s in en via I18nProvider", (status, label) => {
    render(
      <I18nProvider locale="en" dict={getDictionary("en")}>
        <StatusBadge status={status} />
      </I18nProvider>,
    );
    const badge = screen.getByLabelText(`Status: ${label}`);
    assert.ok(badge.textContent.includes(label));
  });

  it.each([
    ["open", "Abierta"],
    ["funded", "Financiada"],
    ["settled", "Liquidada"],
    ["withdrawn", "Retirada"],
    ["cancelled", "Cancelada"],
    ["unknown-state", "Desconocido"],
  ])("renders %s in es via I18nProvider", (status, label) => {
    render(
      <I18nProvider locale="es" dict={getDictionary("es")}>
        <StatusBadge status={status} />
      </I18nProvider>,
    );
    const badge = screen.getByLabelText(`Estado: ${label}`);
    assert.ok(badge.textContent.includes(label));
  });

  it("renders on-chain badge in es via I18nProvider", () => {
    render(
      <I18nProvider locale="es" dict={getDictionary("es")}>
        <StatusBadge kind="chain" />
      </I18nProvider>,
    );
    const badge = screen.getByLabelText("Estado: On-chain");
    assert.ok(badge.textContent.includes("On-chain"));
  });
});
