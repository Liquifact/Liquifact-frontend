import { test } from "node:test";
import assert from "node:assert/strict";
import { sha256Hex, hexToBytes32 } from "../lib/hash.js";

const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

test("sha256Hex matches the known vector for 'abc'", async () => {
  assert.equal(await sha256Hex(new TextEncoder().encode("abc")), ABC);
});

test("hexToBytes32 round-trips and validates length", () => {
  const b = hexToBytes32(ABC);
  assert.equal(b.length, 32);
  assert.equal(b[0], 0xba);
  assert.equal(b[31], 0xad);
  assert.equal(hexToBytes32("0x" + ABC).length, 32);
  assert.throws(() => hexToBytes32("abcd"));
});
