# Security Notes

This repository’s vulnerability disclosure policy is maintained in [SECURITY.md](../SECURITY.md). Please review that document for private reporting guidance, supported versions, and disclosure expectations.

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

The repository also runs automated security checks in CI, including Gitleaks secret scanning and `npm audit --audit-level=high`, as documented in [SECURITY.md](../SECURITY.md).

### Dependencies

- **eslint-plugin-react** (bundled via `eslint-config-next`) — provides the `react/no-danger` rule.
- The rule is configured in `eslint.config.mjs`.

---

_Last updated: 2026-06-27_
