#!/usr/bin/env node
// Checks the ESCROW_ERRORS table against the contracts repo enum (if provided)
// or against the committed JSON snapshot. Fails on duplicate codes or missing codes.

import { readFileSync } from "node:fs";
import { fileURLToPathLocal } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPathLocal(import.meta.url));
const ROOT = resolve(__dirname, "..");

async function main() {
  const errorsMod = await import(resolve(ROOT, "lib/stellar/errors.js"));
  const table = errorsMod.ESCROW_ERRORS;
  const snapshot = errorsMod.ESCROW_CODE_NAMES;

  const failures = [];

  // 1. Table entries must be well-formed.
  const seenCodes = new Set();
  for (const [key, entry] of Object.entries(table)) {
    const num = Number(key);
    if (!Number.isInteger(num)) {
      failures.push(`Table key "${key}" is not an integer.`);
      continue;
    }
    if (seenCodes.has(num)) failures.push(`Duplicate code ${num}.`);
    seenCodes.add(num);
    for (const field of ["title", "message", "action"]) {
      if (!entry || typeof entry[field] !== "string" || entry[field].trim() === "") {
        failures.push(`Code ${num} is missing "${field}".`);
      }
    }
  }

  // 2. Snapshot codes must be covered by the table.
  for (const key of Object.keys(snapshot)) {
    if (key.startsWith("_")) continue;
    const num = Number(key);
    if (!Number.isInteger(num)) continue;
    if (!table[num]) failures.push(`Snapshot code ${num} (${snapshot[key]}) is missing from ESCROW_ERRORS.`);
  }

  // 3. If a contracts repo path is provided, parse the enum and compare.
  const contractsPath =
    process.env.ESCROW_CONTRACT_PATH || process.env.CONTRACTS_REPO_PATH;
  if (contractsPath) {
    const libPath = resolve(contractsPath, "escrow/src/lib.rs");
    try {
      const src = readFileSync(libPath, "utf8");
      const enumBlock = extractEnumBlock(src, "EscrowError");
      if (!enumBlock) {
        failures.push(`Could not locate EscrowError enum in ${libPath}.`);
      } else {
        const parsed = parseEnum(enumBlock);
        for (const [name, code] of Object.entries(parsed)) {
          if (!table[code]) {
            failures.push(`Contract enum ${name} = ${code} is missing from ESCROW_ERRORS.`);
          }
        }
      }
    } catch (err) {
      failures.push(`Could not read contracts repo at ${libPath}: ${err.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("check-escrow-errors failed:");
    for (const f of failures) console.error(`\n  ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log(`check-escrow-errors: ${seenCodes.size} codes verified.`);
}

function extractEnumBlock(src, name) {
  const idx = src.indexOf(`enum ${name}`);
  if (idx < 0) return null;
  const open = src.indexOf("{", idx);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

function parseEnum(block) {
  const out = {};
  const re = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)\s*,?/gm;
  let m;
  while ((m = re.exec(block))) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

main().catch((err) => {
  console.error("check-escrow-errors crashed:", err);
  process.exitCode = 1;
});
