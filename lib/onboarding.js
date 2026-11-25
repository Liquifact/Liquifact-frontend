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
 * @typedef {Object} OnboardingAction
 * @property {"action"|"link"} type     In-page handler or external link
 * @property {string}          labelKey Dictionary key for the CTA label
 * @property {string}          [href]   External URL for link actions
 */

/**
 * @typedef {Object} OnboardingStep
 * @property {string}               id             Stable identifier
 * @property {string}               titleKey       Dictionary key for the short label
 * @property {string}               descriptionKey Dictionary key for the explanation
 * @property {StepStatus}           status
 * @property {OnboardingAction|null} action        CTA descriptor, or null when no action
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
    titleKey: "getStarted.step.install.title",
    descriptionKey: "getStarted.step.install.description",
    status: hasExtension ? "done" : "todo",
    action: hasExtension
      ? null
      : { type: "link", href: "https://freighter.app", labelKey: "getStarted.action.getFreighter" },
  };

  // ── Step 2: Connect wallet ─────────────────────────────────────────────
  const connect = {
    id: "connect",
    titleKey: "getStarted.step.connect.title",
    descriptionKey: "getStarted.step.connect.description",
    status: !hasExtension ? "blocked" : connected ? "done" : "todo",
    action: !hasExtension || connected ? null : { type: "action", labelKey: "getStarted.action.connect" },
  };

  // ── Step 3: Switch to Testnet ──────────────────────────────────────────
  const networkStep = {
    id: "network",
    titleKey: "getStarted.step.network.title",
    descriptionKey: "getStarted.step.network.description",
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
    titleKey: isTestnet ? "getStarted.step.fund.title" : "getStarted.step.fundMainnet.title",
    descriptionKey: isTestnet ? "getStarted.step.fund.description" : "getStarted.step.fundMainnet.description",
    status: fundStatus,
    action: fundStatus === "todo" && isTestnet ? { type: "action", labelKey: "getStarted.action.fund" } : null,
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
    titleKey: "getStarted.step.trustline.title",
    descriptionKey: "getStarted.step.trustline.description",
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
