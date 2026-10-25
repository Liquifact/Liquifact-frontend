import { ValidationError } from "./errors.js";

/**
 * @typedef {Object} Issue
 * @property {string} path
 * @property {string} message
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id
 * @property {string} sme
 * @property {string} debtor
 * @property {number} amount
 * @property {number} fundedAmount
 * @property {string} currency
 * @property {string} dueDate
 * @property {string} status
 * @property {number} yieldBps
 * @property {boolean} [onChain]
 * @property {string} [smeAddress]
 */

/**
 * @typedef {Object} Stats
 * @property {number} totalInvoices
 * @property {number} totalFunded
 * @property {number} openInvoices
 */

/** @param {unknown} v */
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {string} type
 * @param {Issue[]} issues
 */
function requireType(value, path, type, issues) {
  const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  if (actual !== type) {
    issues.push({ path, message: `expected ${type}, got ${actual}` });
    return false;
  }
  return true;
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {Issue[]} issues
 */
function requireString(value, path, issues) {
  if (!requireType(value, path, "string", issues)) return;
  if (value.length === 0) {
    issues.push({ path, message: "must be a non-empty string" });
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {Issue[]} issues
 */
function requireNumber(value, path, issues) {
  if (!requireType(value, path, "number", issues)) return;
  if (!Number.isFinite(value)) {
    issues.push({ path, message: "must be a finite number" });
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {Issue[]} issues
 */
function requireBoolean(value, path, issues) {
  requireType(value, path, "boolean", issues);
}

/**
 * Validate a single invoice object.
 * @param {unknown} value
 * @returns {Invoice}
 */
export function parseInvoice(value) {
  const issues = [];
  if (!isPlainObject(value)) {
    throw new ValidationError("Invoice must be an object", [
      { path: "$", message: `expected object, got ${Array.isArray(value) ? "array" : value === null ? "null" : typeof value}` },
    ]);
  }
  const o = /** @type {Record<string, unknown>} */ (value);
  requireString(o.id, "$.id", issues);
  requireString(o.sme, "$.sme", issues);
  requireString(o.debtor, "$.debtor", issues);
  requireNumber(o.amount, "$.amount", issues);
  requireNumber(o.fundedAmount, "$.fundedAmount", issues);
  requireString(o.currency, "$.currency", issues);
  requireString(o.dueDate, "$.dueDate", issues);
  requireString(o.status, "$.status", issues);
  requireNumber(o.yieldBps, "$.yieldBps", issues);
  if (o.onChain !== undefined) requireBoolean(o.onChain, "$.onChain", issues);
  if (o.smeAddress !== undefined) requireString(o.smeAddress, "$.smeAddress", issues);
  if (issues.length > 0) {
    throw new ValidationError("Invoice response is invalid", issues);
  }
  return /** @type {Invoice} */ (o);
}

/**
 * Validate a list of invoices.
 * @param {unknown} value
 * @returns {Invoice[]}
 */
export function parseInvoiceList(value) {
  if (!Array.isArray(value)) {
    throw new ValidationError("Invoice list must be an array", [
      { path: "$", message: `expected array, got ${value === null ? "null" : typeof value}` },
    ]);
  }
  const issues = [];
  const out = [];
  for (let i = 0; i < value.length; i++) {
    try {
      out.push(parseInvoice(value[i]));
    } catch (err) {
      if (err instanceof ValidationError) {
        for (const issue of err.issues) {
          issues.push({ path: `[${i}]${issue.path.slice(1)}`, message: issue.message });
        }
      } else {
        throw err;
      }
    }
  }
  if (issues.length > 0) {
    throw new ValidationError("Invoice list response is invalid", issues);
  }
  return out;
}

/**
 * Validate a stats object.
 * @param {unknown} value
 * @returns {Stats}
 */
export function parseStats(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError("Stats must be an object", [
      { path: "$", message: `expected object, got ${value === null ? "null" : typeof value}` },
    ]);
  }
  const o = /** @type {Record<string, unknown>} */ (value);
  const issues = [];
  requireNumber(o.totalInvoices, "$.totalInvoices", issues);
  requireNumber(o.totalFunded, "$.totalFunded", issues);
  requireNumber(o.openInvoices, "$.openInvoices", issues);
  if (issues.length > 0) {
    throw new ValidationError("Stats response is invalid", issues);
  }
  return /** @type {Stats} */ (o);
}
