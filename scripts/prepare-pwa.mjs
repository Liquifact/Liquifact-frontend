import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://liquifact-backend.vercel.app").replace(/\/$/, "");
const hash = createHash("sha256").update(apiUrl);
async function include(path) {
  for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = `${path}/${entry.name}`;
    if (entry.isDirectory()) await include(file);
    else hash.update(file).update(await readFile(file));
  }
}
for (const path of ["app", "components", "lib", "public/icons"]) await include(path);
for (const file of ["public/sw.js", "package-lock.json", "next.config.mjs"]) hash.update(await readFile(file));
await mkdir("public", { recursive: true });
await copyFile("lib/pwa/policy.js", "public/pwa-policy.js");
await writeFile("public/pwa-config.js", `export const API_URL = ${JSON.stringify(apiUrl)};\nexport const VERSION = ${JSON.stringify(hash.digest("hex").slice(0, 16))};\n`);
