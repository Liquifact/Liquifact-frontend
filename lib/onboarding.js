/**
 * Pure onboarding-step evaluator.
 *
 * evaluate(state) → ordered array of steps describing what a new investor
 * still needs to do before they can fund an invoice.
 *
 * This module has NO side-effects and no browser dependencies — it is safe
 * to import in node:test without any DOM setup.
 *
 * Step IDs (stable, used as list keys and for aria-describedby targets):
 *   "install"    Install Freighter browser extension
 *   "connect"    Connect / grant wallet access
 *   "network"    Switch Freighter to the configured network (testnet)
 *   "fund"       Fund account via Friendbot (testnet only)
 *   "trustline"  Add USDC trustline (optional)
 */

/**
 * @typedef {"done"|"todo"|"blocked"|"n/a"} StepStatus
 *
 * done     — prerequisite is already satisfied
 * todo     — user can action this step right now
 * blocked  — a prior step must be completed first
 * n/a      — step is not applicable (e.g. Friendbot on mainnet)
 */

/**
 * @typedef {Object} OnboardingState
 * @property {boolean}  hasExtension   Freighter is detected in the browser
 * @property {boolean}  connected      Wallet access has been granted
 * @property {boolean}  networkOk      Freighter is on the expected network
 * @property {boolean}  accountExists  Account record found on Horizon
 * @property {number}   xlmBalance     Native XLM balance (0 when unknown)
 * @property {string[]} trustlines     Uppercase asset codes with active trustlines
 * @property {string}   network        Active network name, e.g. "testnet"
 */

/**
 * @typedef {Object} OnboardingStep
 * @property {string}      id          Stable identifier
 * @property {string}      title       Short label
 * @property {string}      description Explanation shown to the user
 * @property {StepStatus}  status
 * @property {string|null} action      CTA button label, or null when no action
 */

/** Minimum XLM balance to consider an account "funded enough". */
const MIN_XLM_BALANCE = 1;

/**
 * Derive the ordered checklist from the current wallet / account state.
 *
 * @param {OnboardingState} state
 * @returns {OnboardingStep[]}
 */
export function evaluate({
  hasExtension = false,
  connected = false,
  networkOk = false,
  accountExists = false,
  xlmBalance = 0,
  trustlines = [],
  network = "testnet",
} = {}) {
  const isTestnet = network === "testnet";

  // ── Step 1: Install Freighter ──────────────────────────────────────────
  const install = {
    id: "install",
    title: "Install Freighter",
    description:
      "Freighter is the official Stellar browser extension wallet. Download it from freighter.app and add it to your browser.",
    status: hasExtension ? "done" : "todo",
    action: hasExtension ? null : "Get Freighter",
  };

  // ── Step 2: Connect wallet ─────────────────────────────────────────────
  const connect = {
    id: "connect",
    title: "Connect wallet",
    description:
      "Grant LiquiFact read access to your public key so it can check your account status.",
    status: !hasExtension ? "blocked" : connected ? "done" : "todo",
    action: !hasExtension ? null : connected ? null : "Connect",
  };

  // ── Step 3: Switch to Testnet ──────────────────────────────────────────
  const networkStep = {
    id: "network",
    title: "Switch to Testnet",
    description:
      "Open Freighter, click the network selector in the top-right corner, and choose \u201cTest Network\u201d.",
    status: !connected ? "blocked" : networkOk ? "done" : "todo",
    action: null, // cannot do this programmatically; user must act in Freighter
  };

  // ── Step 4: Fund account ───────────────────────────────────────────────
  let fundStatus;
  if (!networkOk) {
    fundStatus = "blocked";
  } else if (!isTestnet) {
    fundStatus = "n/a";
  } else if (accountExists && xlmBalance >= MIN_XLM_BALANCE) {
    fundStatus = "done";
  } else {
    fundStatus = "todo";
  }

  const fund = {
    id: "fund",
    title: isTestnet ? "Fund account via Friendbot" : "Fund your account",
    description: isTestnet
      ? "New testnet accounts don't exist on the ledger until they receive their first transaction. Click the button to request 10,000 XLM from the Stellar testnet Friendbot — it's free and instant."
      : "On mainnet, fund your account through a cryptocurrency exchange or a peer transfer. You need at least 1 XLM to meet the Stellar minimum balance requirement.",
    status: fundStatus,
    action: fundStatus === "todo" && isTestnet ? "Fund with Friendbot" : null,
  };

  // ── Step 5: Add USDC trustline (optional) ─────────────────────────────
  const hasTrustline =
    trustlines.some((t) => t === "USDC") ||
    trustlines.some((t) => t.startsWith("USDC"));

  let trustlineStatus;
  if (!accountExists) {
    trustlineStatus = "blocked";
  } else if (hasTrustline) {
    trustlineStatus = "done";
  } else {
    trustlineStatus = "todo";
  }

  const trustline = {
    id: "trustline",
    title: "Add USDC trustline (optional)",
    description:
      "Many invoices are denominated in USDC. To hold or send USDC your account must have an active trustline. Open Freighter, Add Asset, then search for USDC.",
    status: trustlineStatus,
    action: null, // cannot be done programmatically via Freighter extension API
  };

  return [install, connect, networkStep, fund, trustline];
}

/**
 * Count how many steps are "done" or "n/a" (both count as complete).
 * @param {OnboardingStep[]} steps
 * @returns {{ done: number, total: number }}
 */
export function countProgress(steps) {
  const done = steps.filter(
    (s) => s.status === "done" || s.status === "n/a",
  ).length;
  return { done, total: steps.length };
}
