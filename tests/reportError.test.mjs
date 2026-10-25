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

  it("scrubs sensitive keys matching /secret|token|password|seed|key/i", () => {
    const rawContext = {
      userSecret: "super-secret-value",
      api_token: "xyz123",
      userPassword: "mypassword",
      walletSeedPhrase: "alpha beta gamma",
      publicKey: "G1234567890",
      normalField: "visible",
      nestedObject: { secretField: "kept-as-shallow-only" },
    };

    const scrubbed = scrubContext(rawContext);

    assert.equal(scrubbed.userSecret, "[REDACTED]");
    assert.equal(scrubbed.api_token, "[REDACTED]");
    assert.equal(scrubbed.userPassword, "[REDACTED]");
    assert.equal(scrubbed.walletSeedPhrase, "[REDACTED]");
    assert.equal(scrubbed.publicKey, "[REDACTED]");
    assert.equal(scrubbed.normalField, "visible");
    assert.deepEqual(scrubbed.nestedObject, { secretField: "kept-as-shallow-only" });
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

    assert.equal(capturedError, error);
    assert.deepEqual(capturedContext, {
      route: "/marketplace",
      apiKey: "[REDACTED]",
    });
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

    assert.equal(loggedError, err);
    assert.deepEqual(loggedContext, {
      userToken: "[REDACTED]",
      page: "/docs",
    });
  });
});
