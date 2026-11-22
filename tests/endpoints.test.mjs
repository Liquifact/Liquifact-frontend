import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CONTRACT_ID } from "../lib/config.js";
import {
  getEndpoints,
  getEndpointState,
  isRetryableError,
  markEndpointFailure,
  parseEndpoints,
  resetEndpointFailures,
  withFailover,
} from "../lib/stellar/endpoints.js";
import { loadBalances } from "../lib/stellar/horizon.js";
import { simulateCall } from "../lib/stellar/rpc.js";

describe("lib/stellar/endpoints", () => {
  beforeEach(() => resetEndpointFailures());
  afterEach(() => resetEndpointFailures());

  it("parses comma-separated endpoint lists and drops duplicates", () => {
    assert.deepEqual(
      parseEndpoints(" https://rpc-a.test/rpc , https://rpc-b.test/rpc ,, https://rpc-a.test/rpc "),
      ["https://rpc-a.test/rpc", "https://rpc-b.test/rpc"],
    );
    assert.deepEqual(parseEndpoints(null), []);
  });

  it("reads RPC and Horizon pool overrides from the environment", () => {
    const env = {
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
      NEXT_PUBLIC_STELLAR_RPC_URL: "https://rpc-a.test,https://rpc-b.test",
      NEXT_PUBLIC_HORIZON_URL: "https://horizon-a.test,https://horizon-b.test",
    };
    assert.deepEqual(getEndpoints("rpc", { env, network: "testnet" }), [
      "https://rpc-a.test",
      "https://rpc-b.test",
    ]);
    assert.deepEqual(getEndpoints("horizon", { env, network: "testnet" }), [
      "https://horizon-a.test",
      "https://horizon-b.test",
    ]);
  });

  it("uses the next endpoint after a network or 5xx failure", async () => {
    const calls = [];
    const result = await withFailover("rpc", async (endpoint) => {
      calls.push(endpoint);
      if (endpoint === "https://rpc-a.test") {
        const error = new TypeError("fetch failed");
        error.name = "TypeError";
        throw error;
      }
      if (endpoint === "https://rpc-b.test") {
        const error = new Error("RPC request failed (503)");
        error.status = 503;
        throw error;
      }
      return endpoint;
    }, {
      endpoints: ["https://rpc-a.test", "https://rpc-b.test", "https://rpc-c.test"],
      now: () => 0,
      cooldownMs: 1000,
    });

    assert.equal(result, "https://rpc-c.test");
    assert.deepEqual(calls, [
      "https://rpc-a.test",
      "https://rpc-b.test",
      "https://rpc-c.test",
    ]);
    assert.equal(getEndpointState("rpc", "https://rpc-a.test").failures, 1);
    assert.equal(getEndpointState("rpc", "https://rpc-b.test").failures, 1);
  });

  it("never fails over on contract or simulation errors", async () => {
    const calls = [];
    const contractError = new Error("Contract call get_escrow failed: HostError");
    contractError.retryable = false;
    contractError.contractError = true;

    await assert.rejects(
      withFailover("rpc", async (endpoint) => {
        calls.push(endpoint);
        throw contractError;
      }, { endpoints: ["https://rpc-a.test", "https://rpc-b.test"], now: () => 0 }),
      /HostError/,
    );
    assert.deepEqual(calls, ["https://rpc-a.test"]);
    assert.equal(getEndpointState("rpc", "https://rpc-a.test"), null);
    assert.equal(isRetryableError(contractError), false);

    const server = {
      simulateTransaction: async () => ({ error: "HostError: contract not found" }),
    };
    await assert.rejects(
      simulateCall({ contractId: CONTRACT_ID, method: "get_escrow", server }),
      (error) => error.contractError === true && error.retryable === false,
    );
  });

  it("keeps failed endpoints in cooldown until the injected clock advances", async () => {
    let now = 0;
    const options = {
      endpoints: ["https://rpc-a.test", "https://rpc-b.test"],
      now: () => now,
      cooldownMs: 5000,
    };

    await withFailover("rpc", async (endpoint) => {
      if (endpoint === "https://rpc-a.test") throw new TypeError("fetch failed");
      return endpoint;
    }, options);

    assert.equal(getEndpointState("rpc", "https://rpc-a.test").failedAt, 0);

    const cooledCalls = [];
    await withFailover("rpc", async (endpoint) => {
      cooledCalls.push(endpoint);
      return endpoint;
    }, options);
    assert.deepEqual(cooledCalls, ["https://rpc-b.test"]);

    now = 5000;
    const recoveredCalls = [];
    await withFailover("rpc", async (endpoint) => {
      recoveredCalls.push(endpoint);
      return endpoint;
    }, options);
    assert.deepEqual(recoveredCalls, ["https://rpc-a.test"]);
  });

  it("fails over when a Horizon pool member returns 5xx", async () => {
    resetEndpointFailures("horizon");
    const calls = [];
    const fetchFn = async (url) => {
      calls.push(url);
      if (url.startsWith("https://horizon-a.test")) {
        return { ok: false, status: 503 };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          subentry_count: 1,
          balances: [{ asset_type: "native", balance: "42.0000000" }],
        }),
      };
    };

    const result = await loadBalances("GTEST", {
      endpoints: ["https://horizon-a.test", "https://horizon-b.test"],
      fetchFn,
      now: () => 0,
      cooldownMs: 1000,
    });

    assert.equal(calls.length, 2);
    assert.match(calls[0], /horizon-a\.test/);
    assert.match(calls[1], /horizon-b\.test/);
    assert.equal(result.balances[0].code, "XLM");
    assert.equal(result.balances[0].balance, "42.0000000");
    assert.equal(getEndpointState("horizon", "https://horizon-a.test").failedAt, 0);
  });

  it("does not mark endpoints for 4xx responses", () => {
    assert.equal(isRetryableError(Object.assign(new Error("bad request (400)"), { status: 400 })), false);
    const error = new Error("fetch failed");
    markEndpointFailure("rpc", "https://rpc-a.test", 10);
    assert.ok(getEndpointState("rpc", "https://rpc-a.test"));
    assert.equal(isRetryableError(error), true);
  });
});
