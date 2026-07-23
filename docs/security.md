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

### CI Enforcement

The lint step in CI runs `npm run lint`, which includes the `react/no-danger` rule. Any new introduction of `dangerouslySetInnerHTML` will be caught and block the pipeline.

### Dependencies

- **eslint-plugin-react** (bundled via `eslint-config-next`) — provides the `react/no-danger` rule.
- The rule is configured in `eslint.config.mjs`.

---

## Untrusted External Data Sanitization & Clamping

To prevent DOM bloat, UI layout corruption, and spoofing attacks from untrusted external or backend data sources, string fields rendered on the frontend are sanitized and clamped at the API boundary in `lib/api/invoices.js` via `clampAndSanitizeText`:

1. **Control Character Stripping:** Non-printable ASCII control characters (`0x00`-`0x1F`, `0x7F`-`0x9F`) are stripped out.
2. **Bidirectional (Bidi) Control Stripping:** Unicode directional formatting and override characters (`U+202A`–`U+202E`, `U+2066`–`U+2069`, `U+200E`, `U+200F`, `U+061C`) are removed to prevent text/number order spoofing.
3. **Length Clamping:** String fields are bounded to safe maximum lengths (`issuer` and `reference` capped at 256 characters, `description` capped at 1024 characters).

### Impacted Fields

* `issuer`: Clamped to 256 characters.
* `description`: Clamped to 1024 characters.
* `reference`: Clamped to 256 characters.

---

_Last updated: 2026-07-23_

_Last updated: 2026-06-27_
