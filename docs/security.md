# Security Notes

## XSS Prevention

### ESLint Rule: `react/no-danger`

The project enforces the `react/no-danger` ESLint rule at the **error** level. Any use of `dangerouslySetInnerHTML` will cause the build to fail.

### Audit (2026-06-27)

A full codebase audit found **one** occurrence of `dangerouslySetInnerHTML` in production source code:

| File            | Line | Usage                                                                                                           | Verdict                                        |
| --------------- | ---- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `app/layout.js` | 55   | Inline theme script (`THEME_SCRIPT` constant) — runs before React hydration to prevent flash of incorrect theme | Safe — static constant, not user-supplied data |

All other content is rendered via:

- Static JSX expressions (`{content}`)
- `JSON.stringify()` inside `<pre>` blocks (safe)
- Text content through React's built-in escaping

### Exception Allowlist

| File               | Reason                                                                                                                                          | Approved |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `app/layout.js:55` | Pre-hydration theme script — content is a compile-time constant (`THEME_SCRIPT`), no user input involved. Required for flash-free theme toggle. | ✅       |

### CSP nonce policy

The application now issues a per-request CSP nonce via middleware and applies it to the inline pre-hydration theme script in [app/layout.js](app/layout.js). This removes the need for `'unsafe-inline'` in `script-src` while keeping the script functional for Next.js hydration and theme initialization.

### CSP violation reports

`proxy.js` can roll the policy out in report-only mode (`NEXT_PUBLIC_CSP_REPORT_ONLY=1` sends `Content-Security-Policy-Report-Only` instead of enforcing). Violations are received by a first-party endpoint, `POST /api/csp-report` ([app/api/csp-report/route.js](../app/api/csp-report/route.js)), built from [lib/security/cspReport.js](../lib/security/cspReport.js).

**Wiring**

- With `NEXT_PUBLIC_CSP_REPORT_ONLY=1` and no `CSP_REPORT_URI` / `NEXT_PUBLIC_CSP_REPORT_URI`, `buildCsp` adds `report-uri /api/csp-report` by default. An explicit report URI always wins; when enforcing, no `report-uri` is added unless one is configured.
- `proxy.js` excludes `/api` from its matcher, so the endpoint itself is not wrapped in the policy.

**Accepted requests**

| Content-Type                | Payload                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `application/csp-report`    | Legacy `report-uri`: `{ "csp-report": { "blocked-uri": ... } }`  |
| `application/reports+json`  | Reporting API `report-to`: `[{ "type": "csp-violation", "body": { ... } }]` |

Both are normalized to the same shape: `directive`, `blockedUri`, `documentUri`, `sourceFile`, `lineNumber`, `columnNumber`, `disposition`, `sample`. Other Reporting API report types are skipped, and at most 10 reports are read from one batch.

**Hardening**

- **Size cap:** bodies over 8 KB are rejected with `413`, checked on `Content-Length` and again while streaming the body.
- **Validation:** the body must be JSON holding at least one valid `csp-violation`; the directive must be a plain directive name. Unknown fields are dropped, strings are truncated (URLs to 256 characters, the script sample to 128) and control characters are stripped.
- **Privacy:** URLs are reduced to `scheme://host/path`; userinfo, query strings and fragments (which can carry tokens) are never stored or forwarded. `data:` and `blob:` URLs keep only the scheme.
- **Rate limit:** a per-IP in-memory token bucket (burst 20, refill 1 per second). Over the limit returns `429` with `Retry-After`. The IP comes from `x-forwarded-for` / `x-real-ip`, so it is only as reliable as the proxy in front of the app.
- **De-duplication:** reports with the same directive and blocked host inside a 60-second window are forwarded once.
- **Forwarding:** each new report is passed to `reportError` with a `source: "csp-report"` context. `reportError` scrubs sensitive keys and Stellar secret seeds (a script sample containing a seed is redacted).

**Responses**

| Status | Meaning                                              |
| ------ | ---------------------------------------------------- |
| `204`  | Accepted (including duplicates, which are not forwarded) |
| `400`  | Not JSON, or no valid CSP report in the body         |
| `413`  | Body over 8 KB                                       |
| `415`  | Content type is not one of the two above             |
| `429`  | Rate limited                                         |

The rate limiter and de-duplication state live in server memory, so each serverless instance keeps its own; they bound abuse but are not a global limit. Reports are untrusted input from any origin: treat the stream as a signal, not as evidence.

### CI Enforcement

The lint step in CI runs `npm run lint`, which includes the `react/no-danger` rule. Any new introduction of `dangerouslySetInnerHTML` will be caught and block the pipeline.

### Dependencies

- **eslint-plugin-react** (bundled via `eslint-config-next`) — provides the `react/no-danger` rule.
- The rule is configured in `eslint.config.mjs`.

---

_Last updated: 2026-06-27_
