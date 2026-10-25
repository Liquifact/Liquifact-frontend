import { test } from "node:test";
import assert from "node:assert/strict";
import { scValToNative } from "@stellar/stellar-sdk";
import { loadFunders, summariseFunders } from "../lib/escrow/funders.js";

const G = (n) => `G${String(n).padStart(55, "A")}`;

test("summariseFunders computes shares that sum to ~100%", async (t) => {
  await t.test("three funders, shares sum to 100 (within rounding)", () => {
    const { rows, concentration } = summariseFunders([
      [G(1), "10000000"],
      [G(2), "10000000"],
      [G(3), "10000000"],
    ]);
    const sum = rows.reduce((a, r) => a + r.sharePct, 0);
    assert.ok(Math.abs(sum - 99.99) < 0.02 || Math.abs(sum - 100) < 0.02, `sum=${sum}`);
    assert.equal(concentration, "medium"); // 33.33% top share
  });

  await t.test("single funder is high concentration", () => {
    const { rows, topShare, concentration } = summariseFunders([[G(1), "5000000"]]);
    assert.equal(rows[0].sharePct, 100);
    assert.equal(topShare, 100);
    assert.equal(concentration, "high");
  });

  await t.test("zero total yields zero shares, low concentration", () => {
    const { rows, concentration } = summariseFunders([[G(1), "0"]], "0");
    assert.equal(rows[0].sharePct, 0);
    assert.equal(concentration, "low");
  });

  await t.test("empty records", () => {
    const { rows, total, concentration } = summariseFunders([]);
    assert.equal(rows.length, 0);
    assert.equal(total, 0n);
    assert.equal(concentration, "low");
  });

  await t.test("large i128 values stay exact", () => {
    const big = "170141183460469231731687303715884105727"; // i128 max
    const { rows } = summariseFunders([[G(1), big]], big);
    assert.equal(rows[0].sharePct, 100);
    assert.equal(rows[0].amount.toString(), big);
  });

  await t.test("two funders 25/75 boundary shares", () => {
    const { rows, concentration } = summariseFunders([
      [G(1), "2500000"],
      [G(2), "7500000"],
    ]);
    assert.equal(rows[0].sharePct, 25);
    assert.equal(rows[1].sharePct, 75);
    assert.equal(concentration, "high");
  });

  await t.test("top share just above 50% is high", () => {
    const { concentration } = summariseFunders([
      [G(1), "2499000"],
      [G(2), "7501000"],
    ], "10000000");
    assert.equal(concentration, "high");
  });

  await t.test("top share at 50% exactly is medium", () => {
    const { concentration } = summariseFunders([
      [G(1), "5000000"],
      [G(2), "5000000"],
    ]);
    assert.equal(concentration, "medium");
  });
});

test("loadFunders paginates against the injected contract call", async (t) => {
  const ledger = Array.from({ length: 25 }, (_, i) => [G(i + 1), String((i + 1) * 1000000)]);
  const calls = [];
  const fakeCall = async ({ method, args }) => {
    calls.push(method);
    if (method === "get_unique_funder_count") return ledger.length;
    if (method === "get_funding_records") {
      const [start, limit] = args.map((a) => Number(scValToNative(a)));
      return ledger.slice(start, start + limit).map(([a, v]) => [a, BigInt(v)]);
    }
    throw new Error(`unexpected ${method}`);
  };

  await t.test("first page returns full page size", async () => {
    const r = await loadFunders({ page: 1, pageSize: 10, call: fakeCall });
    assert.equal(r.records.length, 10);
    assert.equal(r.totalCount, 25);
    assert.equal(r.pageCount, 3);
    assert.equal(r.page, 1);
    assert.equal(r.records[0][0], G(1));
    assert.equal(typeof r.records[0][1], "string");
  });

  await t.test("last partial page returns remaining rows", async () => {
    const r = await loadFunders({ page: 3, pageSize: 10, call: fakeCall });
    assert.equal(r.records.length, 5);
    assert.equal(r.records[4][0], G(25));
  });

  await t.test("out-of-range page clamps to last page", async () => {
    const r = await loadFunders({ page: 99, pageSize: 10, call: fakeCall });
    assert.equal(r.page, 3);
    assert.equal(r.records.length, 5);
  });

  await t.test("zero funders skips the records call", async () => {
    calls.length = 0;
    const emptyCall = async ({ method }) => {
      calls.push(method);
      if (method === "get_unique_funder_count") return 0;
      throw new Error("must not be called");
    };
    const r = await loadFunders({ call: emptyCall });
    assert.deepEqual(calls, ["get_unique_funder_count"]);
    assert.deepEqual(r.records, []);
    assert.equal(r.pageCount, 1);
  });
});
