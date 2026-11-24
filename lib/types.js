/**
 * @typedef {"XLM" | "USDC" | "EURC"} Currency
 */

/**
 * @typedef {object} Invoice
 * @property {string} [id]
 * @property {string} [contractId]
 * @property {number} [amount]
 * @property {number} [fundedAmount]
 * @property {string} [status]
 */

/**
 * @typedef {object} EscrowConstraints
 * @property {bigint | null} minContributionFloor
 * @property {bigint | null} maxPerInvestorCap
 * @property {bigint | null} remainingCapacity
 * @property {number | null} fundingDeadline
 * @property {boolean | null} paused
 * @property {boolean | null} legalHold
 * @property {number | null} status
 * @property {bigint | null} contribution
 * @property {Array<{method: string, message: string}>} errors
 */

/**
 * @typedef {object} ContributionValidation
 * @property {boolean} ok
 * @property {number} amount
 * @property {"REQUIRED" | "NOT_OPEN" | "NOT_A_NUMBER" | "NON_POSITIVE" | "TOO_MANY_DECIMALS" | "EXCEEDS_REMAINING" | null} error
 */

export {};
