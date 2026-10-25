/**
 * Poll a Soroban transaction until it reaches a final state.
 * Uses exponential backoff after 10 seconds.
 */

import { rpc as SorobanRpc } from "@stellar/stellar-sdk";

const POLL_INTERVAL_MS = 1500;
const MAX_BACKOFF_MS = 10000;
const BACKOFF_START_MS = 10000; // Start exponential backoff after 10s from start
const DEFAULT_TIMEOUT_MS = 60000;

const RESULT = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  NOT_FOUND_TIMEOUT: "NOT_FOUND_TIMEOUT",
};

/**
 * Poll a transaction until it succeeds, fails, or times out.
 * @param {SorobanRpc.Server} server - RPC server instance
 * @param {string} hash - Transaction hash (64 hex chars)
 * @param {Object} options
 * @param {number} [options.intervalMs=1500] - Base polling interval
 * @param {number} [options.timeoutMs=60000] - Total timeout
 * @param {AbortSignal} [options.signal] - Abort signal
 * @returns {Promise<"SUCCESS"|"FAILED"|"NOT_FOUND_TIMEOUT">}
 */
export async function pollTransaction(server, hash, options = {}) {
  const {
    intervalMs = POLL_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;

  const startTime = Date.now();
  const deadline = startTime + timeoutMs;
  let currentInterval = intervalMs;

  // Check for abort immediately
  if (signal?.aborted) {
    const err = new Error("Aborted");
    err.name = "AbortError";
    throw err;
  }

  // Create a promise that rejects when abort signal fires
  let abortPromise;
  if (signal) {
    abortPromise = new Promise((_, reject) => {
      const onAbort = () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  try {
    while (Date.now() < deadline) {
      // Check abort before each poll
      if (signal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }

      // Race between polling and abort signal
      let status;
      try {
        if (abortPromise) {
          const tx = await Promise.race([server.getTransaction(hash), abortPromise]);
          status = tx.status;
        } else {
          status = (await server.getTransaction(hash)).status;
        }
      } catch (e) {
        if (e.name === "AbortError") throw e;
        // Network error - treat as transient, continue polling
        await sleep(currentInterval);
        continue;
      }

      // Handle Soroban RPC statuses
      // NOT_FOUND means transaction hasn't been ingested yet - keep polling
      if (status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
        await sleep(currentInterval);
        // Exponential backoff after 10 seconds from start
        if (Date.now() > startTime + BACKOFF_START_MS) {
          currentInterval = Math.min(currentInterval * 1.5, MAX_BACKOFF_MS);
        }
        continue;
      }

      // Reset not-found counter on any other status (not needed anymore)

      if (status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        return RESULT.SUCCESS;
      }

      if (status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        return RESULT.FAILED;
      }

      // Any other status (PENDING, etc.) - keep polling
      await sleep(currentInterval);
    }

    // Timeout reached
    return RESULT.NOT_FOUND_TIMEOUT;
  } finally {
    // Cleanup handled by abortPromise's once listener
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { RESULT };