import { validateInvoiceForm } from "./format.js";
import { isValidPublicKey } from "./stellar/address.js";

export const DRAFT_KEY = "liquifact-submit-draft";

export const EMPTY_FORM = {
  sme: "",
  debtor: "",
  amount: "",
  currency: "USDC",
  yieldPercent: "8.00",
  dueDate: "",
  smeAddress: "",
  confirmed: false,
  document: null,
};

export const STEPS = [
  { id: "details", titleKey: "submit.step.details", fields: ["sme", "debtor", "amount", "currency"] },
  { id: "terms", titleKey: "submit.step.terms", fields: ["yieldPercent", "dueDate", "smeAddress"] },
  { id: "review", titleKey: "submit.step.review", fields: ["confirmed"] },
];

export const LAST_STEP = STEPS.length - 1;

// Stable validation error codes. The UI maps them to dictionary messages.
export const CONFIRM_ERROR = "confirmed.required";
export const YIELD_ERROR = "yield.format";
export const SME_ADDRESS_ERROR = "smeAddress.invalid";

export const VALIDATION_ERROR_CODES = Object.freeze([
  "sme.required",
  "debtor.required",
  "amount.positive",
  "yield.range",
  "yield.format",
  "dueDate.required",
  "smeAddress.invalid",
  "confirmed.required",
]);

/** Dictionary key for a validation error code, or null for unknown values. */
export function errorMessageKey(code) {
  return VALIDATION_ERROR_CODES.includes(code) ? `submit.error.${code}` : null;
}

const SHA256_RE = /^[a-f0-9]{64}$/;

/** Keep only validated PDF metadata; never store bytes or File objects. */
export function normalizeDocument(value) {
  if (!value || typeof value !== "object") return null;
  const { name, size, sha256 } = value;
  if (typeof name !== "string" || !name.trim() || !name.toLowerCase().endsWith(".pdf")) return null;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null;
  if (typeof sha256 !== "string" || !SHA256_RE.test(sha256)) return null;
  return { name, size, sha256 };
}

/** Parse the `?step=` query string into a zero-based step index. */
export function stepFromSearch(search, totalSteps = STEPS.length) {
  const n = Number(new URLSearchParams(search || "").get("step"));
  return Number.isInteger(n) && n >= 1 && n <= totalSteps ? n - 1 : 0;
}

/**
 * Convert a percent string to integer basis points.
 * Policy: values with more than 2 decimal places (e.g. "8.125") are rejected (NaN), never rounded.
 */
export function percentToBps(value) {
  const s = String(value ?? "").trim();
  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

export function bpsLabel(value) {
  const bps = percentToBps(value);
  return Number.isNaN(bps) ? "— bps" : `${bps} bps`;
}

/** Estimated investor payout (principal + flat yield) per 1,000 units. */
export function payoutPer1000(value) {
  const bps = percentToBps(value);
  if (Number.isNaN(bps)) return null;
  return 1000 + (1000 * bps) / 10000;
}

export function tomorrowISO(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toPayload(form) {
  const wallet = (form.smeAddress || "").trim();
  const document = normalizeDocument(form.document);
  return {
    sme: form.sme,
    debtor: form.debtor,
    amount: Number(form.amount),
    currency: form.currency,
    yieldBps: percentToBps(form.yieldPercent),
    dueDate: form.dueDate,
    ...(wallet && isValidPublicKey(wallet) ? { smeAddress: wallet } : {}),
    ...(document ? { documentSha256: document.sha256 } : {}),
  };
}

function allErrors(form) {
  const raw = validateInvoiceForm({ ...form, yieldBps: String(percentToBps(form.yieldPercent)) });
  const errors = {};
  for (const [k, v] of Object.entries(raw)) errors[k === "yieldBps" ? "yieldPercent" : k] = v;
  if (errors.yieldPercent) errors.yieldPercent = YIELD_ERROR;
  const wallet = (form.smeAddress || "").trim();
  if (wallet && !isValidPublicKey(wallet)) {
    errors.smeAddress = SME_ADDRESS_ERROR;
  }
  return errors;
}

export function stepErrors(form, step) {
  const all = allErrors(form);
  const errors = {};
  for (const f of STEPS[step].fields) if (all[f]) errors[f] = all[f];
  return errors;
}

/** Errors for the whole form including the confirmation checkbox. */
export function validateAll(form) {
  const errors = allErrors(form);
  if (!form.confirmed) errors.confirmed = CONFIRM_ERROR;
  return errors;
}

export function firstInvalidStep(form) {
  for (let i = 0; i < LAST_STEP; i++) if (Object.keys(stepErrors(form, i)).length) return i;
  return LAST_STEP;
}

export function canAdvance(state) {
  if (state.step >= LAST_STEP) return false;
  return Object.keys(stepErrors(state.form, state.step)).length === 0;
}

export function initialState(form = EMPTY_FORM) {
  const merged = { ...EMPTY_FORM, ...form };
  return {
    step: 0,
    form: { ...merged, document: normalizeDocument(merged.document) },
    touched: {},
    errors: {},
    status: { state: "idle" },
    returnToReview: false,
  };
}

function touch(touched, fields) {
  const next = { ...touched };
  for (const f of fields) next[f] = true;
  return next;
}

export function reducer(state, action) {
  switch (action.type) {
    case "set": {
      const value = action.field === "document" ? normalizeDocument(action.value) : action.value;
      const form = { ...state.form, [action.field]: value };
      const errors = { ...state.errors };
      if (state.touched[action.field] || errors[action.field]) {
        const fresh = validateAll(form)[action.field];
        if (fresh) errors[action.field] = fresh;
        else delete errors[action.field];
      }
      return { ...state, form, errors };
    }
    case "blur":
      return { ...state, touched: touch(state.touched, [action.field]) };
    case "next": {
      if (state.step >= LAST_STEP) return state;
      const fields = STEPS[state.step].fields;
      const touched = touch(state.touched, fields);
      const errors = stepErrors(state.form, state.step);
      if (Object.keys(errors).length) return { ...state, touched, errors };
      return { ...state, touched, errors: {}, step: state.returnToReview ? LAST_STEP : state.step + 1, returnToReview: false };
    }
    case "back":
      return state.step === 0 ? state : { ...state, step: state.step - 1, errors: {}, returnToReview: false };
    case "edit":
      return { ...state, step: action.step, errors: {}, returnToReview: true };
    case "setStep": {
      // Used for URL navigation: never land beyond the first step that still has errors.
      const target = Math.max(0, Math.min(LAST_STEP, action.step));
      const step = Math.min(target, firstInvalidStep(state.form));
      return { ...state, step, errors: {}, returnToReview: false };
    }
    case "restore":
      return {
        ...state,
        form: {
          ...EMPTY_FORM,
          ...action.form,
          confirmed: false,
          document: normalizeDocument(action.form?.document),
        },
        step: 0,
      };
    case "discard":
      return initialState();
    case "invalid": {
      const errors = action.errors;
      const keys = Object.keys(errors);
      const step = STEPS.findIndex((s) => s.fields.some((f) => keys.includes(f)));
      return { ...state, errors, touched: touch(state.touched, keys), step: step < 0 ? state.step : step };
    }
    case "submitStart":
      return { ...state, errors: {}, status: { state: "submitting" } };
    case "submitError":
      return { ...state, status: { state: "error", message: action.message, details: action.details || [] } };
    case "submitSuccess":
      return { ...state, status: { state: "success", invoice: action.invoice } };
    case "reset":
      return initialState();
    default:
      return state;
  }
}
