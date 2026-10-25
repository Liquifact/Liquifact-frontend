import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDeployments,
  DEPLOYMENTS,
  escrowFor,
  isValidContractId,
  parseRegistryJson,
} from "../lib/escrow/registry.js";

const VALID_CONTRACT_1 = "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";
const VALID_CONTRACT_2 = "CA3D5KRYMCMUZKMAQTCZZRM5RUMSSS6RIYRHQD2ELHSH4ENCQA6KZ7PW";
const ACCOUNT_G_STRKEY = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";

test("isValidContractId validation", () => {
  assert.equal(isValidContractId(VALID_CONTRACT_1), true);
  assert.equal(isValidContractId(VALID_CONTRACT_2), true);

  // Rejects Stellar account keys starting with G
  assert.equal(isValidContractId(ACCOUNT_G_STRKEY), false);

  // Rejects lowercase
  assert.equal(isValidContractId(VALID_CONTRACT_1.toLowerCase()), false);

  // Rejects wrong length (55 and 57 chars)
  assert.equal(isValidContractId(VALID_CONTRACT_1.slice(0, 55)), false);
  assert.equal(isValidContractId(VALID_CONTRACT_1 + "A"), false);

  // Rejects invalid Base32 chars (0, 1, 8, 9, punctuation)
  assert.equal(isValidContractId("C" + "0".repeat(55)), false);
  assert.equal(isValidContractId("C" + "1".repeat(55)), false);
  assert.equal(isValidContractId("C" + "8".repeat(55)), false);
  assert.equal(isValidContractId("C" + "9".repeat(55)), false);
  assert.equal(isValidContractId("C" + "!".repeat(55)), false);

  // Rejects non-string types
  assert.equal(isValidContractId(null), false);
  assert.equal(isValidContractId(undefined), false);
  assert.equal(isValidContractId(12345), false);
  assert.equal(isValidContractId({}), false);
});

test("parseRegistryJson handles valid, empty, and malformed inputs", () => {
  // Empty or missing
  assert.deepEqual(parseRegistryJson(""), {});
  assert.deepEqual(parseRegistryJson(undefined), {});
  assert.deepEqual(parseRegistryJson("   "), {});

  // Valid JSON object
  const valid = JSON.stringify({ INV_0002: VALID_CONTRACT_2 });
  assert.deepEqual(parseRegistryJson(valid), { INV_0002: VALID_CONTRACT_2 });

  // Malformed JSON (must warn and return empty object without throwing)
  let warned = false;
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warned = true;
  };
  try {
    const malformed = parseRegistryJson("{invalid-json");
    assert.deepEqual(malformed, {});
    assert.equal(warned, true);

    // Non-object JSON (array, primitive)
    warned = false;
    assert.deepEqual(parseRegistryJson("[\"INV_0001\"]"), {});
    assert.equal(warned, true);
  } finally {
    console.warn = originalWarn;
  }
});

test("buildDeployments seeds from env and merges extra registry", () => {
  const customEnv = {
    NEXT_PUBLIC_CONTRACT_ID: VALID_CONTRACT_1,
    NEXT_PUBLIC_CONTRACT_INVOICE_ID: "INV_9999",
    NEXT_PUBLIC_ESCROW_REGISTRY: JSON.stringify({ INV_8888: VALID_CONTRACT_2 }),
  };

  const map = buildDeployments(customEnv);
  assert.equal(map["INV_9999"], VALID_CONTRACT_1);
  assert.equal(map["INV_8888"], VALID_CONTRACT_2);
});

test("escrowFor: explicit valid contractId", () => {
  const result = escrowFor({
    id: "INV_0001",
    contractId: VALID_CONTRACT_2,
  });
  assert.deepEqual(result, {
    contractId: VALID_CONTRACT_2,
    source: "invoice",
  });
});

test("escrowFor: invalid explicit contractId is rejected even if registry has one", () => {
  // Precedence test: explicit contractId must be strictly validated.
  // If invalid, it should NOT fall back to the registry deployment.
  const customRegistry = { INV_0001: VALID_CONTRACT_1 };

  const withMalformedId = escrowFor(
    { id: "INV_0001", contractId: "not-a-valid-contract-strkey" },
    customRegistry
  );
  assert.equal(withMalformedId, null);

  const withAccountKey = escrowFor(
    { id: "INV_0001", contractId: ACCOUNT_G_STRKEY },
    customRegistry
  );
  assert.equal(withAccountKey, null);
});

test("escrowFor: registry hit", () => {
  const customRegistry = {
    INV_0001: VALID_CONTRACT_1,
    INV_0002: VALID_CONTRACT_2,
  };

  const result1 = escrowFor({ id: "INV_0001" }, customRegistry);
  assert.deepEqual(result1, {
    contractId: VALID_CONTRACT_1,
    source: "registry",
  });

  const result2 = escrowFor("INV_0002", customRegistry);
  assert.deepEqual(result2, {
    contractId: VALID_CONTRACT_2,
    source: "registry",
  });
});

test("escrowFor: registry miss", () => {
  const customRegistry = { INV_0001: VALID_CONTRACT_1 };

  const result = escrowFor({ id: "INV_UNKNOWN" }, customRegistry);
  assert.equal(result, null);

  assert.equal(escrowFor(null, customRegistry), null);
  assert.equal(escrowFor(undefined, customRegistry), null);
  assert.equal(escrowFor({}, customRegistry), null);
});

test("escrowFor: malformed registry JSON is ignored with console warning and never throws", () => {
  const prevEnv = process.env.NEXT_PUBLIC_ESCROW_REGISTRY;
  let warned = false;
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warned = true;
  };

  try {
    process.env.NEXT_PUBLIC_ESCROW_REGISTRY = "{broken-json";
    // Should not throw, should log warning, and fallback to base deployment
    const result = escrowFor({ id: "INV_0001" });
    assert.equal(warned, true);
    assert.ok(result);
    assert.equal(result.source, "registry");
  } finally {
    console.warn = originalWarn;
    if (prevEnv === undefined) {
      delete process.env.NEXT_PUBLIC_ESCROW_REGISTRY;
    } else {
      process.env.NEXT_PUBLIC_ESCROW_REGISTRY = prevEnv;
    }
  }
});

test("escrowFor: registry entry with invalid contractId is ignored", () => {
  const customRegistry = { INV_CORRUPT: "invalid-contract-strkey" };
  assert.equal(escrowFor({ id: "INV_CORRUPT" }, customRegistry), null);
});
