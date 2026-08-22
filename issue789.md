Label settings icon buttons
Description
settings's icon-only buttons lack accessible names. This issue adds labels and correct roles.

Requirements and context
Repository scope: Liquifact/Liquifact-frontend only.
Give every icon-only settings control an accessible name (aria-label) and correct role; no visual change.
Verify with an a11y check if available.
Cover accessible names in tests.
Suggested execution
Fork the repo and create a branch
git checkout -b a11y/settings-51-iconlabels
Implement changes
Write code in: the relevant module.
Write comprehensive tests in: cover the new behaviour and edge cases.
Test and commit
Test and commit
Run npm run lint, npm test, and npm run build.
Cover edge cases: each icon button has an accessible name.
Include the full test output in the PR description.
Example commit message
a11y(settings): label icon buttons

Guidelines
Minimum 95 percent test coverage for impacted modules.
Clear, reviewer-focused documentation.
