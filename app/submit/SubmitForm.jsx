"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { createInvoice } from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { createOutbox, isNetworkError } from "@/lib/outbox";
import UploadZone from "@/components/UploadZone";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import {
  DRAFT_KEY,
  STEPS,
  LAST_STEP,
  errorMessageKey,
  reducer,
  initialState,
  stepFromSearch,
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
  return stepFromSearch(window.location.search);
}

export default function SubmitForm() {
  const t = useT();
  const locale = useLocale();
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const { step, form, errors, status } = state;
  const [restored, setRestored] = useState(false);
  const [queued, setQueued] = useState(null);
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
    const timer = setTimeout(() => {
      try {
        const { confirmed, ...rest } = form;
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
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
  }, [step, status.state, queued]);

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

  function errorText(code) {
    const key = errorMessageKey(code);
    return key ? t(key) : String(code || "");
  }

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
    const payload = toPayload(form);
    try {
      const res = await createInvoice(payload);
      const invoice = res?.data;
      if (!invoice || !invoice.id) {
        dispatch({ type: "submitError", message: t("submit.error.noInvoiceData"), details: [] });
        return;
      }
      clearDraft();
      setQueued(null);
      dispatch({ type: "submitSuccess", invoice });
    } catch (err) {
      if (isNetworkError(err)) {
        const outbox = createOutbox(typeof window !== "undefined" ? window.localStorage : null);
        const entry = outbox.enqueue(payload);
        clearDraft();
        dispatch({ type: "reset" });
        setRestored(false);
        setQueued(entry);
        return;
      }
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
        {errors[k] && <span className="err" id={errId} role="alert">{errorText(errors[k])}</span>}
        {hint && <span className="hint" id={hintId}>{hint}</span>}
      </div>
    );
  };

  const payout = payoutPer1000(form.yieldPercent);
  const summary = [
    [0, t("submit.summary.company"), form.sme],
    [0, t("submit.summary.debtor"), form.debtor],
    [0, t("submit.summary.amount"), formatAmount(form.amount, form.currency, locale)],
    [1, t("submit.summary.yield"), `${form.yieldPercent}% (${bpsLabel(form.yieldPercent)})`],
    [1, t("submit.summary.dueDate"), form.dueDate],
    [1, t("submit.summary.wallet"), form.smeAddress.trim() || t("submit.summary.notProvided")],
  ];

  let body;
  if (status.state === "success") {
    body = (
      <div>
        <h2 tabIndex={-1} ref={headingRef}>{t("submit.success.title")}</h2>
        <div className="notice notice-ok">
          {t("submit.success.bodyPrefix")}
          {status.invoice?.id || "—"}
          {t("submit.success.bodySuffix")}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          {status.invoice?.id && (
            <Link className="btn btn-primary" href={`/marketplace/${status.invoice.id}`}>{t("submit.success.view")}</Link>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => { dispatch({ type: "reset" }); setRestored(false); }}>
            {t("submit.submitAnother")}
          </button>
        </div>
      </div>
    );
  } else if (queued) {
    body = (
      <div>
        <h2 tabIndex={-1} ref={headingRef}>{t("submit.queued.title")}</h2>
        <div className="notice" role="status">
          {t("submit.queued.body")}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={() => { setQueued(null); dispatch({ type: "reset" }); setRestored(false); }}>
            {t("submit.submitAnother")}
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <form className="form" onSubmit={onSubmit} noValidate ref={formRef}>
        <h2 tabIndex={-1} ref={headingRef} style={{ fontSize: "1.2rem" }}>
          {t("submit.stepHeading", { current: step + 1, total: STEPS.length, title: t(STEPS[step].titleKey) })}
        </h2>
        {step === 0 && (
          <>
            {field("sme", t("submit.field.sme"), { placeholder: t("submit.placeholder.sme"), autoComplete: "organization" })}
            {field("debtor", t("submit.field.debtor"), { placeholder: t("submit.placeholder.debtor") })}
            <div className="grid grid-2" style={{ gap: 14 }}>
              {field("amount", t("submit.field.amount"), { type: "number", min: "0", step: "any", inputMode: "decimal", placeholder: "25000" })}
              <div className="field">
                <label htmlFor="currency">{t("submit.field.currency")}</label>
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
            {field("yieldPercent", t("submit.field.yield"), { type: "number", min: "0", max: "100", step: "0.01", inputMode: "decimal" }, t("submit.hint.yield", { bps: bpsLabel(form.yieldPercent) }))}
            {field("dueDate", t("submit.field.dueDate"), { type: "date", min: tomorrowISO() })}
            {field("smeAddress", t("submit.field.wallet"), { placeholder: "G…", autoComplete: "off" })}
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
                    <button type="button" className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: "0.8rem" }} onClick={() => dispatch({ type: "edit", step: s })} aria-label={t("submit.editAria", { field: k })}>
                      {t("submit.edit")}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="muted">
              {t("submit.payout", { currency: form.currency })}{" "}
              <strong>{payout === null ? "—" : `${payout.toLocaleString(locale, { maximumFractionDigits: 2 })} ${form.currency}`}</strong>
            </p>
            <UploadZone value={form.document} onChange={(document) => dispatch({ type: "set", field: "document", value: document })} />
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
                <span>{t("submit.field.confirmed")}</span>
              </label>
              {errors.confirmed && <span className="err" id="confirmed-err" role="alert">{errorText(errors.confirmed)}</span>}
            </div>
          </>
        )}
        <div className="btn-row">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "back" })} disabled={status.state === "submitting"}>
              {t("submit.back")}
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={status.state === "submitting"}>
            {step < LAST_STEP ? t("submit.next") : status.state === "submitting" ? t("submit.submitting") : t("submit.submit")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="section">
      <div className="container grid grid-2" style={{ alignItems: "start", gap: 40 }}>
        <div>
          <div className="eyebrow">{t("submit.eyebrow")}</div>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>{t("submit.title")}</h1>
          <p className="lead">{t("submit.lead")}</p>
          <ul className="muted" style={{ paddingLeft: "1.2em" }}>
            <li>{t("submit.bullet.yield")}</li>
            <li>{t("submit.bullet.escrow")}</li>
            <li>{t("submit.bullet.debtor")}</li>
          </ul>
          <p className="muted">
            {t("submit.guidePrefix")}
            <Link href="/docs#how-to-use">{t("submit.guideLink")}</Link>
            {t("submit.guideSuffix")}
          </p>
        </div>
        <div className="card">
          {status.state !== "success" && !queued && (
            <ol aria-label={t("submit.progressLabel")} style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: "0 0 16px" }}>
              {STEPS.map((s, i) => (
                <li key={s.id} aria-current={i === step ? "step" : undefined} style={{ fontWeight: i === step ? 700 : 400, color: i === step ? "var(--fg)" : "var(--muted)" }}>
                  {i + 1}. {t(s.titleKey)}
                  {i < STEPS.length - 1 ? " ›" : ""}
                </li>
              ))}
            </ol>
          )}
          {restored && status.state !== "success" && !queued && (
            <div className="notice" role="status" style={{ marginBottom: 16 }}>
              {t("submit.restored")}{" "}
              <button type="button" className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: "0.85rem" }} onClick={discard}>
                {t("submit.discard")}
              </button>
            </div>
          )}
          {body}
          <div aria-live="polite" role="status" style={{ marginTop: 16 }}>
            {status.state === "submitting" && <span className="muted">{t("submit.status.submitting")}</span>}
            {status.state === "success" && <span>{t("submit.status.success", { id: status.invoice?.id || "—" })}</span>}
            {status.state === "error" && (
              <div className="notice notice-err">
                {t("submit.status.errorPrefix", { message: status.message })}
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
