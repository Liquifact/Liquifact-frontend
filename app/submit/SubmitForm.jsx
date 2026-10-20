"use client";

import Link from "next/link";
import { useState } from "react";
import { createInvoice } from "@/lib/api";
import { validateInvoiceForm } from "@/lib/format";

const EMPTY = { sme: "", debtor: "", amount: "", currency: "USDC", yieldBps: "800", dueDate: "", smeAddress: "" };

export default function SubmitForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = validateInvoiceForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setResult(null);
    try {
      const payload = {
        sme: form.sme,
        debtor: form.debtor,
        amount: form.amount,
        currency: form.currency,
        yieldBps: Number(form.yieldBps),
        dueDate: form.dueDate,
        ...(form.smeAddress ? { smeAddress: form.smeAddress } : {}),
      };
      const { data } = await createInvoice(payload);
      setResult({ ok: true, invoice: data });
      setForm(EMPTY);
    } catch (err) {
      setResult({ ok: false, text: (err.details && err.details.join("; ")) || err.message });
    } finally {
      setBusy(false);
    }
  }

  const field = (k, label, props = {}, hint) => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      <input id={k} value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] ? <span className="err">{errors[k]}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );

  return (
    <section className="section">
      <div className="container grid grid-2" style={{ alignItems: "start", gap: 40 }}>
        <div>
          <div className="eyebrow">For SMEs</div>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Get paid today for tomorrow&apos;s invoices</h1>
          <p className="lead">List an unpaid B2B invoice. Investors fund it through the LiquiFact escrow and you receive liquidity as soon as the target is reached.</p>
          <ul className="muted" style={{ paddingLeft: "1.2em" }}>
            <li>Set the yield you offer investors in basis points (800 = 8%).</li>
            <li>Funds are held by the Soroban escrow until settlement.</li>
            <li>The debtor pays at maturity and investors are repaid with yield.</li>
          </ul>
          <p className="muted">Read the <Link href="/docs#how-to-use">step-by-step guide</Link>.</p>
        </div>
        <div className="card">
          <form className="form" onSubmit={onSubmit} noValidate>
            {field("sme", "Company name", { placeholder: "Acme Components Ltd" })}
            {field("debtor", "Debtor (who owes the invoice)", { placeholder: "Globex Retail" })}
            <div className="grid grid-2" style={{ gap: 14 }}>
              {field("amount", "Amount", { type: "number", min: "0", step: "any", inputMode: "decimal", placeholder: "25000" })}
              <div className="field">
                <label htmlFor="currency">Currency</label>
                <select id="currency" value={form.currency} onChange={set("currency")}>
                  <option>USDC</option>
                  <option>XLM</option>
                  <option>EURC</option>
                </select>
              </div>
            </div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              {field("yieldBps", "Investor yield (bps)", { type: "number", min: "0", max: "10000", step: "1" }, "800 bps = 8.00%")}
              {field("dueDate", "Due date", { type: "date" })}
            </div>
            {field("smeAddress", "Stellar wallet (optional)", { placeholder: "G…", autoComplete: "off" })}
            <button className="btn btn-primary" disabled={busy}>{busy ? "Submitting…" : "Submit invoice"}</button>
            {result && result.ok && (
              <div className="notice notice-ok">
                Invoice <strong>{result.invoice.id}</strong> created. <Link href={`/marketplace/${result.invoice.id}`}>View listing →</Link>
              </div>
            )}
            {result && !result.ok && <div className="notice notice-err">Could not submit: {result.text}</div>}
          </form>
        </div>
      </div>
    </section>
  );
}
