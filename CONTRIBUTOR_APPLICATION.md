# Contributor Application — "Make failure recovery deterministic in `app/robots.js`"

**Repository:** Liquifact/Liquifact-frontend
**File under review:** `app/robots.js`
**Related files:** `app/robots.test.tsx`, `app/sitemap.js`, `app/sitemap.test.tsx`, `app/layout.js`, `lib/observability/reportError.js`, `next.config.mjs`, `.env.local.example`, `docs/configuration.md`, `.github/workflows/ci.yml`
**Branch convention:** `fix/seo-<issue-number>-robots-deterministic-recovery`

---

## Why I am applying

I have traced every execution path in `app/robots.js` and its entire dependency surface. The file is small but the failure modes identified below are real, reproducible, and currently untested. The fix is a bounded, safe change with zero effect on callers, zero new dependencies, and a clear test plan.

---

## What the code actually does today

```js
// app/robots.js  (full source — 10 lines)
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

`robots()` is a plain synchronous function with no imports, no async work, and no error handling. Next.js calls it automatically when it serves `/robots.txt`; nothing else in the codebase imports it. The only external dependency is `process.env.NEXT_PUBLIC_SITE_URL`, which is a `NEXT_PUBLIC_` variable and is therefore baked in at build time, not resolved per request.

---

## Failure modes identified (all grounded in the source)

### FM-1 — Silent production `localhost` leak

`NEXT_PUBLIC_*` variables are inlined by `next build`. If `NEXT_PUBLIC_SITE_URL` is absent or empty at build time, `baseUrl` is hardcoded to `"http://localhost:3000"` and the emitted `robots.txt` will permanently contain `Sitemap: http://localhost:3000/sitemap.xml`. Search engines attempt to fetch that URL, fail silently, and log a persistent sitemap error. Neither the build nor the test suite raises a warning.

`app/layout.js` (same env var, same build) guards against this with `new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")`, which throws a `TypeError` at render time if the value is not a parseable absolute URL. `app/robots.js` applies no equivalent guard.

### FM-2 — Invalid URL silently emitted

Because the env var is concatenated directly into a template literal with no validation, these values produce malformed `robots.txt` output without any error:

| `NEXT_PUBLIC_SITE_URL` value | `sitemap` field produced | Problem |
|---|---|---|
| `"https://app.liquifact.io/"` (trailing slash) | `"https://app.liquifact.io//sitemap.xml"` | Double slash — some parsers reject it |
| `"localhost:3000"` (no protocol) | `"localhost:3000/sitemap.xml"` | Not an absolute URL; RFC 9309 requires absolute URLs in `Sitemap:` directives |
| `" https://app.liquifact.io"` (leading space) | `" https://app.liquifact.io/sitemap.xml"` | Leading whitespace; technically malformed |
| `"ftp://app.liquifact.io"` | `"ftp://app.liquifact.io/sitemap.xml"` | Non-HTTP scheme; `robots.txt` spec only accepts HTTP/HTTPS |

`app/layout.js` normalises the same variable through `new URL()`, which strips trailing slashes from the origin and rejects non-parseable strings. `app/robots.js` does neither.

### FM-3 — Module-level evaluation creates non-deterministic test isolation

`const baseUrl = …` executes at module-load time. Jest caches modules in `require.cache`. The existing test uses `require("./robots").default` (CommonJS style, deliberate — see `TODO.md` entry for the polyfill ordering fix). If a future test mutates `process.env.NEXT_PUBLIC_SITE_URL` without resetting the module registry between tests, the cached `baseUrl` value carries across test cases silently. This is the same class of issue that was already fixed in `robots.test.tsx` for the `Request/Response/Headers` polyfill.

### FM-4 — No `Disallow` rules for API or preview paths

The current policy (`allow: "/"`, no `disallow` entries) instructs all crawlers to index every path. The absence of a `Disallow: /api/` convention is a missing safeguard. This is noted for scope discussion with the maintainer; it does not block the core FM-1/FM-2 work.

### FM-5 — CI gap: build is not run on PRs

The `build-and-test` CI job (which runs `npm test`) executes on both push and pull requests. The `build` job (which runs `npm run build`) runs only on push to `main`. A PR that introduces a `NEXT_PUBLIC_SITE_URL` value that breaks Next.js metadata serialisation would pass CI on the PR itself and only fail after merge. CONTRIBUTING.md acknowledges this: "Run `npm run build` locally for UI or routing changes."

---

## Proposed deterministic recovery design

The entire fix lives in two files: `app/robots.js` (behaviour) and `app/robots.test.tsx` (coverage). No other file needs to change.

### `app/robots.js` — proposed logic

1. Read `NEXT_PUBLIC_SITE_URL` at call time inside `robots()`, not at module scope, so the function is self-contained and test-isolation-safe without requiring module cache manipulation.
2. Attempt `new URL(raw)`. This is the same guard `app/layout.js` already applies.
   - If the URL is valid: normalise (use `origin` to strip trailing slash, enforce `https:` or `http:` scheme).
   - If the URL throws (`TypeError`): fall back to `"http://localhost:3000"` and emit a `console.warn`. The warn message must not expose the raw value, only the key name.
3. Return the same object shape as today. The Next.js App Router contract (`rules`, `sitemap`) is unchanged.
4. The function remains synchronous. No `async`, no new imports, no new dependencies.

### State and invariants

- No module-level mutable state. Moving `baseUrl` inside `robots()` eliminates the module-evaluation-time cache.
- No side effects beyond the conditional `console.warn` on misconfiguration.
- No persisted or in-memory user data is involved — `robots.txt` is a public, stateless, content-free HTTP response.
- Authorization: there is no auth to maintain. `/robots.txt` is intentionally public. The `/:path*` security headers in `next.config.mjs` already apply to `/robots.txt` and are untouched.

### Retries, partial failures, concurrency, duplicates

`robots()` is synchronous and stateless. There is no network call, no I/O, no locking. Concurrent invocations are safe by construction. Duplicate calls produce identical output. None of these concerns apply.

### User-visible errors and observability

- The fallback is transparent to end users: `/robots.txt` is always served with a valid body.
- The `console.warn` is server-side only, never reaching the browser.
- The warn message: `[robots] NEXT_PUBLIC_SITE_URL is not a valid absolute URL; falling back to http://localhost:3000`. It names the env var key and the fallback value but does not echo the raw invalid value (preventing accidental secret leakage, consistent with the `SENSITIVE_KEYS` scrubbing pattern in `lib/observability/reportError.js`).

---

## Test plan

### Existing tests that can be reused

`app/robots.test.tsx` — the existing `"returns proper robots meta"` test remains valid and must continue to pass without modification.

### Missing coverage that must be added (all in `app/robots.test.tsx`)

| Test case | Scenario type | Maps to |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL = "https://example.com"` → `sitemap` equals `"https://example.com/sitemap.xml"` | Success / custom env var | FM-1, FM-2 |
| `NEXT_PUBLIC_SITE_URL = "https://example.com/"` (trailing slash) → no double slash | Boundary / normalisation | FM-2 |
| `NEXT_PUBLIC_SITE_URL` unset → fallback to `http://localhost:3000/sitemap.xml` | Default fallback / recovery | FM-1, FM-3 |
| `NEXT_PUBLIC_SITE_URL = "not-a-url"` → fallback + `console.warn` with key name, no throw | Invalid input / deterministic recovery | FM-2, FM-3 |
| `NEXT_PUBLIC_SITE_URL = " https://example.com"` (leading whitespace) → normalised or falls back | Boundary | FM-2 |
| `sitemap` value is always an absolute URL starting with `http://` or `https://` | Invariant | FM-2 |
| `sitemap` value never contains `{…}` placeholder | Regression | sitemap test pattern |
| `rules.userAgent` and `rules.allow` unchanged regardless of env var | Regression | existing |
| Two consecutive calls with different env var values return different results (no stale cache) | Isolation / FM-3 | FM-3 |

---

## Compatibility considerations

- **Next.js framework**: return value shape (`{ rules, sitemap }`) is identical.
- **`app/robots.test.tsx`**: existing test still passes; new tests do not require `jest.resetModules()`.
- **`app/sitemap.js`**: not modified (same exposure, out of scope).
- **`app/layout.js`**, **`next.config.mjs`**, **`docs/configuration.md`**, **`.env.local.example`**: no changes needed.

---

## CI commands that must pass

```bash
npm run lint
npm run format:check
npm test --silent
npm run build   # run locally per CONTRIBUTING.md
```

---

## Acceptance criterion mapping

| Criterion | Specific change | Test(s) |
|---|---|---|
| `robots()` never throws regardless of env var state | `try/new URL` with explicit fallback inside function body | invalid input, boundary tests |
| `robots()` always returns a valid absolute `sitemap` URL | normalise via `URL.prototype.origin` | trailing slash, no-protocol tests |
| Fallback to `http://localhost:3000` is deterministic | move `baseUrl` inside function; remove module-scope const | isolation / two-call test |
| Misconfigured env var emits observable warning without exposing raw value | `console.warn` with key name only | invalid input test spies on `console.warn` |
| Existing callers and tests unaffected | no shape change to return value | existing test unchanged |
| `{…}` placeholder never appears in output | template literal uses resolved `origin` | regression test |
| Object shape always present | invariant maintained through fallback path | regression tests |

---

## Implementation estimate

**Scope:** 1 file changed (`app/robots.js`, ~15 lines net), 1 file extended (`app/robots.test.tsx`, ~40 lines of new test cases).
**Estimated time:** 2–3 hours including local lint, test, and build verification.
**Risk:** Low. The function is pure and synchronous. The change moves one constant from module scope into function scope and adds a single `try/catch` around `new URL()`.

---

## Status

> Implementation will begin only after maintainer assignment. No files have been modified, created beyond this document, deleted, renamed, formatted, or committed as part of this application.
