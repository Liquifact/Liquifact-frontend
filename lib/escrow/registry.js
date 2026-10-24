import { CONTRACT_ID, CONTRACT_INVOICE_ID } from "../config.js";

/**
 * Validates whether a given value is a valid Stellar contract ID strkey.
 * A contract ID must be a string starting with 'C', exactly 56 characters long,
 * and contain only RFC 4648 Base32 alphabet characters (A-Z, 2-7).
 *
 * @param {unknown} id
 * @returns {boolean}
 */
export function isValidContractId(id) {
  if (typeof id !== "string") return false;
  return /^C[A-Z2-7]{55}$/.test(id);
}

/**
 * Safely parses the NEXT_PUBLIC_ESCROW_REGISTRY JSON environment variable.
 * Emits a console warning on malformed JSON or non-object structures, but never throws.
 *
 * @param {string | undefined} raw
 * @returns {Record<string, string>}
 */
export function parseRegistryJson(raw) {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn("[escrow/registry] NEXT_PUBLIC_ESCROW_REGISTRY must be a JSON object");
      return {};
    }
    return parsed;
  } catch (err) {
    console.warn("[escrow/registry] Malformed NEXT_PUBLIC_ESCROW_REGISTRY JSON:", err.message);
    return {};
  }
}

/**
 * Builds the deployments map from the provided environment or default configuration.
 * Seeded from NEXT_PUBLIC_CONTRACT_ID bound to NEXT_PUBLIC_CONTRACT_INVOICE_ID (default INV_0001)
 * plus any entries from NEXT_PUBLIC_ESCROW_REGISTRY.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {Record<string, string>}
 */
export function buildDeployments(env = (typeof process !== "undefined" ? process.env : {})) {
  const defaultInvoiceId = env?.NEXT_PUBLIC_CONTRACT_INVOICE_ID || CONTRACT_INVOICE_ID || "INV_0001";
  const defaultContractId = env?.NEXT_PUBLIC_CONTRACT_ID || CONTRACT_ID || "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";

  const deployments = {};
  if (defaultInvoiceId && defaultContractId) {
    deployments[defaultInvoiceId] = defaultContractId;
  }

  const extra = parseRegistryJson(env?.NEXT_PUBLIC_ESCROW_REGISTRY);
  Object.assign(deployments, extra);

  return deployments;
}

/**
 * Global DEPLOYMENTS map { [invoiceId]: contractId } seeded from config.
 */
export const DEPLOYMENTS = buildDeployments();

/**
 * Resolves the escrow contract to use for an invoice.
 *
 * Precedence:
 * 1. Explicit `invoice.contractId`:
 *    - If present and valid (56-char C... strkey), returns `{ contractId, source: "invoice" }`.
 *    - If present and invalid, REJECTS and returns `null`. It does NOT fall back to the registry.
 *      Rationale: An explicit invalid/malformed contractId may indicate data corruption
 *      or a tampering attempt. Falling back to a different contract could lead to
 *      transactions being submitted to the wrong escrow contract.
 * 2. Known deployment registry:
 *    - If `invoice.id` exists in the deployment registry and is a valid strkey, returns `{ contractId, source: "registry" }`.
 * 3. Otherwise returns `null`.
 *
 * @param {object | string | null | undefined} invoice
 * @param {Record<string, string>} [registry] Optional override for deployment registry map
 * @returns {{ contractId: string, source: "invoice" | "registry" } | null}
 */
export function escrowFor(invoice, registry) {
  if (!invoice) return null;

  const inv = typeof invoice === "string" ? { id: invoice } : invoice;
  if (typeof inv !== "object" || inv === null) return null;

  // 1. Explicit invoice.contractId takes precedence
  if (inv.contractId !== undefined && inv.contractId !== null) {
    if (isValidContractId(inv.contractId)) {
      return { contractId: inv.contractId, source: "invoice" };
    }
    // Explicit contractId was provided but failed validation.
    // Strictly reject; do NOT fall back to registry.
    return null;
  }

  // 2. Registry lookup by invoice ID
  if (inv.id) {
    const activeRegistry = registry ?? (typeof process !== "undefined" ? buildDeployments() : DEPLOYMENTS);
    const registeredId = activeRegistry[inv.id];
    if (isValidContractId(registeredId)) {
      return { contractId: registeredId, source: "registry" };
    }
  }

  return null;
}
