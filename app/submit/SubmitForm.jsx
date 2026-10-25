"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { createInvoice } from "@/lib/api";
import { formatAmount } from "@/lib/format";
import {
  DRAFT_KEY,
  STEPS,
  LAST_STEP,
  reducer,
  initialState,
  toPayload,
  validateAll,
  bpsLabel,
  payoutPer1000,
  tomorrowISO,
} from "@/lib/submitWizard";

function readDraft() {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

function urlStep() {
  const n = Number(new URLSearchParams(window.location.search).get("step"));
  return Number.isInteger(n) && n >= 1 && n <= STEPS.length ? n - 1 : 0;
}

export default function SubmitForm() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const { step, form, errors, status } = state;
  const [restored, setRestored] = useState(false);
  const headingRef = useRef(null);
  const formRef = useRef(null);
  const focusErrors = useRef(false);
  const mounted = useRef(false);
  const hydrated = useRef(false);

  // Restore draft and initial step from the URL.
  useEffect(() => {
    const draft = readDraft();
    if (draft && typeof draft === "object") {
      dispatch({ type: "restore", form: draft });
      setRestored(true);
    }
    const s = urlStep();
    if (s > 0) dispatch({ type: "setStep", step: s });
    hydrated.current = true;
    const onPop = () => dispatch({ type: "setStep", step: urlStep() });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Debounced draft persistence.
  useEffect(() => {
    if (!hydrated.current || status.state === "success") return undefined;
    const t = setTimeout(() => {
      try {
        const { confirmed, ...rest } = form;
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [form, status.state]);

  // Keep ?step= in sync (pushState so browser Back goes to the previous step).
  useEffect(() => {
    if (!hydrated.current) return;
    if (urlStep() !== step) window.history.pushState({}, "", `?step=${step + 1}`);
  }, [step]);

  // Move focus to the step heading on step change.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (headingRef.current) headingRef.current.focus();
  }, [step, status.state]);

  // Move focus to the first invalid field.
  useEffect(() => {
    if (!focusErrors.current) return;
    focusErrors.current = false;
    const keys = Object.keys(errors);
    if (!keys.length || !formRef.current) return;
    const el = [...formRef.current.querySelectorAll("[data-field]")].find((n) => keys.includes(n.dataset.field));
    if (el) el.focus();
  }, [errors]);

  const set = (field) => (e) => dispatch({ type: "set", field, value: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const blur = (field) => () => dispatch({ type: "blur", field });

  function discard() {
    clearDraft();
    dispatch({ type: "discard" });
    setRestored(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (status.state === "submitting") return;
    focusErrors.current = true;
    if (step < LAST_STEP) {
      dispatch({ type: "next" });
      return;
    }
    const errs = validateAll(form);
    if (Object.keys(errs).length) {
      dispatch({ type: "invalid", errors: errs });
      return;
    }
    focusErrors.current = false;
    dispatch({ type: "submitStart" });
    try {
      const { data } = await createInvoice(toPayload(form));
      clearDraft();
      dispatch({ type: "submitSuccess", invoice: data });
    } catch (err) {
      dispatch({ type: "submitError", message: err.message, details: err.details });
    }
  }

  const field = (k, label, props = {}, hint) => {
    const errId = `${k}-err`;
    const hintId = `${k}-hint`;
    const describedBy = [errors[k] ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
    return (
      <div className="field">
        <label htmlFor={k}>{label}</label>
        <input id={k} data-field={k} value={form[k]} onChange={set(k)} onBlur={blur(k)} aria-invalid={!!errors[k]} aria-describedby={describedBy} {...props} />
        {errors[k] && <span className="err" id={errId}>{errors[k]}</span>}
        {hint && <span className="hint" id={hintId}>{hint}</span>}
      </div>
    );
  };

  const payout = payoutPer1000(form.yieldPercent);
  const summary = [
    [0, "Company", form.sme],
    [0, "Debtor", form.debtor],
    [0, "Amount", formatAmount(form.amount, form.currency)],
    [1, "Investor yield", `${form.yieldPercent}% (${bpsLabel(form.yieldPercent)})`],
    [1, "Due date", form.dueDate],
    [1, "Stellar wallet", form.smeAddress.trim() || "Not provided"],
  ];

  let body;
  if (status.state === "success") {
    body = (
      <div>
        <h2 tabIndex={-1} ref={headingRef}>Invoice submitted</h2>
        <div className="notice notice-ok">
          Invoice <strong>{status.invoice.id}</strong> created.
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href={`/marketplace/${status.invoice.id}`}>View listing →</Link>
          <button type="button" className="btn btn-ghost" onClick={() => { dispatch({ type: "reset" }); setRestored(false); }}>
            Submit another
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <form className="form" onSubmit={onSubmit} noValidate ref={formRef}>
        <h2 tabIndex={-1} ref={headingRef} style={{ fontSize: "1.2rem" }}>
          Step {step + 1} of {STEPS.length}: {STEPS[step].title}
        </h2>
        {step === 0 && (
          <>
            {field("sme", "Company name", { placeholder: "Acme Components Ltd", autoComplete: "organization" })}
            {field("debtor", "Debtor (who owes the invoice)", { placeholder: "Globex Retail" })}
            <div className="grid grid-2" style={{ gap: 14 }}>
              {field("amount", "Amount", { type: "number", min: "0", step: "any", inputMode: "decimal", placeholder: "25000" })}
              <div className="field">
                <label htmlFor="currency">Currency</label>
                <select id="currency" data-field="currency" value={form.currency} onChange={set("currency")}>
                  <option>USDC</option>
                  <option>XLM</option>
                  <option>EURC</option>
                </select>
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            {field("yieldPercent", "Investor yield (%)", { type: "number", min: "0", max: "100", step: "0.01", inputMode: "decimal" }, `${bpsLabel(form.yieldPercent)} — enter a percentage, e.g. 8 for 8%`)}
            {field("dueDate", "Due date", { type: "date", min: tomorrowISO() })}
            {field("smeAddress", "Stellar wallet (optional)", { placeholder: "G…", autoComplete: "off" })}
          </>
        )}
        {step === 2 && (
          <>
            <dl className="review" style={{ display: "grid", gap: 10, margin: 0 }}>
              {summary.map(([s, k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <dt className="muted">{k}</dt>
                  <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                    {v}{" "}
                    <button type="button" className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: "0.8rem" }} onClick={() => dispatch({ type: "edit", step: s })} aria-label={`Edit ${k}`}>
                      Edit
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="muted">
              Estimated investor payout per 1,000 {form.currency}: <strong>{payout === null ? "—" : `${payout.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${form.currency}`}</strong>
            </p>
            <div className="field">
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  id="confirmed"
                  data-field="confirmed"
                  style={{ width: "auto", marginTop: 4 }}
                  checked={form.confirmed}
                  onChange={set("confirmed")}
                  aria-invalid={!!errors.confirmed}
                  aria-describedby={errors.confirmed ? "confirmed-err" : undefined}
                />
                <span>I confirm this invoice is genuine and unpaid</span>
              </label>
              {errors.confirmed && <span className="err" id="confirmed-err">{errors.confirmed}</span>}
            </div>
          </>
        )}
        <div className="btn-row">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "back" })} disabled={status.state === "submitting"}>
              Back
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={status.state === "submitting"}>
            {step < LAST_STEP ? "Next" : status.state === "submitting" ? "Submitting…" : "Submit invoice"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="section">
      <div className="container grid grid-2" style={{ alignItems: "start", gap: 40 }}>
        <div>
          <div className="eyebrow">For SMEs</div>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Get paid today for tomorrow&apos;s invoices</h1>
          <p className="lead">List an unpaid B2B invoice. Investors fund it through the LiquiFact escrow and you receive liquidity as soon as the target is reached.</p>
          <ul className="muted" style={{ paddingLeft: "1.2em" }}>
            <li>Set the yield you offer investors as a percentage (8 = 8% = 800 bps).</li>
            <li>Funds are held by the Soroban escrow until settlement.</li>
            <li>The debtor pays at maturity and investors are repaid with yield.</li>
          </ul>
          <p className="muted">Read the <Link href="/docs#how-to-use">step-by-step guide</Link>.</p>
        </div>
        <div className="card">
          {status.state !== "success" && (
            <ol aria-label="Progress" style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: "0 0 16px" }}>
              {STEPS.map((s, i) => (
                <li key={s.id} aria-current={i === step ? "step" : undefined} style={{ fontWeight: i === step ? 700 : 400, color: i === step ? "var(--fg)" : "var(--muted)" }}>
                  {i + 1}. {s.title}
                  {i < STEPS.length - 1 ? " ›" : ""}
                </li>
              ))}
            </ol>
          )}
          {restored && status.state !== "success" && (
            <div className="notice" role="status" style={{ marginBottom: 16 }}>
              Restored your draft.{" "}
              <button type="button" className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: "0.85rem" }} onClick={discard}>
                Discard
              </button>
            </div>
          )}
          {body}
          <div aria-live="polite" role="status" style={{ marginTop: 16 }}>
            {status.state === "submitting" && <span className="muted">Submitting your invoice…</span>}
            {status.state === "success" && <span>Invoice {status.invoice.id} was created.</span>}
            {status.state === "error" && (
              <div className="notice notice-err">
                Could not submit: {status.message}
                {status.details.length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: "1.2em" }}>
                    {status.details.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
