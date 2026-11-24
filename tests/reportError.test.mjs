import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { reportError, setReporter, scrubContext } from "../lib/observability/reportError.js";

describe("lib/observability/reportError", () => {
  let originalConsoleError;

  beforeEach(() => {
    originalConsoleError = console.error;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    setReporter(null);
  });

  it("scrubs sensitive keys recursively and scrubs strings containing Stellar seeds", () => {
    const stellarSeed = `S${"A".repeat(55)}`;
    const rawContext = {
      userSecret: "super-secret-value",
      api_token: "xyz123",
      userPassword: "mypassword",
      walletSeedPhrase: "alpha beta gamma",
      publicKey: "G1234567890",
      normalField: "visible",
      nestedObject: {
        secretField: "nested-secret",
        items: [{ apiKey: "nested-key", note: `seed: ${stellarSeed}` }],
      },
    };

    const scrubbed = scrubContext(rawContext);

    assert.equal(scrubbed.userSecret, "[REDACTED]");
    assert.equal(scrubbed.api_token, "[REDACTED]");
    assert.equal(scrubbed.userPassword, "[REDACTED]");
    assert.equal(scrubbed.walletSeedPhrase, "[REDACTED]");
    assert.equal(scrubbed.publicKey, "[REDACTED]");
    assert.equal(scrubbed.normalField, "visible");
    assert.deepEqual(scrubbed.nestedObject, {
      secretField: "[REDACTED]",
      items: [{ apiKey: "[REDACTED]", note: "seed: [REDACTED]" }],
    });
  });

  it("handles cyclic context without throwing", () => {
    const context = { nested: { password: "hidden" } };
    context.nested.parent = context;

    const scrubbed = scrubContext(context);

    assert.equal(scrubbed.nested.password, "[REDACTED]");
    assert.equal(scrubbed.nested.parent, scrubbed);
  });

  it("leaves non-object context intact", () => {
    assert.equal(scrubContext(null), null);
    assert.equal(scrubContext(undefined), undefined);
    assert.equal(scrubContext("plain string"), "plain string");
    assert.deepEqual(scrubContext([1, 2, 3]), [1, 2, 3]);
  });

  it("supports setting a custom reporter", () => {
    let capturedError = null;
    let capturedContext = null;

    setReporter((err, ctx) => {
      capturedError = err;
      capturedContext = ctx;
    });

    const error = new Error("Test error");
    reportError(error, { route: "/marketplace", apiKey: "secret-key" });

    assert.notEqual(capturedError, error);
    assert.equal(capturedError.message, "Test error");
    assert.deepEqual(capturedContext, {
      route: "/marketplace",
      apiKey: "[REDACTED]",
    });
  });

  it("scrubs Stellar seeds in error messages and cause chains before reporting", () => {
    const stellarSeed = `S${"B".repeat(55)}`;
    const error = new Error(`Failed with ${stellarSeed}`, {
      cause: new Error(`Underlying failure: ${stellarSeed}`),
    });
    let capturedError;

    setReporter((err) => {
      capturedError = err;
    });
    reportError(error);

    assert.equal(capturedError.message, "Failed with [REDACTED]");
    assert.equal(capturedError.cause.message, "Underlying failure: [REDACTED]");
    assert.equal(error.message, `Failed with ${stellarSeed}`);
  });

  it("does not throw when custom reporter throws", () => {
    setReporter(() => {
      throw new Error("Telemetry failure");
    });

    assert.doesNotThrow(() => {
      reportError(new Error("App crash"), { key: "secret" });
    });
  });

  it("logs to console.error by default", () => {
    let loggedError = null;
    let loggedContext = null;

    console.error = (err, ctx) => {
      loggedError = err;
      loggedContext = ctx;
    };

    setReporter(null); // Reset to default

    const err = new Error("Default console error");
    reportError(err, { userToken: "secret123", page: "/docs" });

    assert.notEqual(loggedError, err);
    assert.equal(loggedError.message, "Default console error");
    assert.equal(loggedError.message, err.message);
    // reportError forwards a scrubbed copy (#1554), never the original reference.
    assert.ok(loggedError instanceof Error);
    assert.equal(loggedError.message, err.message);
    assert.deepEqual(loggedContext, {
      userToken: "[REDACTED]",
      page: "/docs",
    });
  });
});
