Export marketplace
Description
Users can't export marketplace data. This issue adds a client-side CSV/JSON export of the current view.

Requirements and context
Repository scope: Liquifact/Liquifact-frontend only.
Export the currently filtered marketplace view as CSV and JSON with safe escaping; trigger a client download.
Accessible control; no server round-trip.
Cover escaping, filter-respect, and empty view in tests.
Suggested execution
Fork the repo and create a branch
git checkout -b feature/marketplace-51-export
Implement changes
Write code in: the relevant module.
Write comprehensive tests in: cover the new behaviour and edge cases.
Test and commit
Test and commit
Run npm run lint, npm test, and npm run build.
Cover edge cases: escaping, respects filter, empty view.
Include the full test output in the PR description.
Example commit message
feat(marketplace): add CSV/JSON export

Guidelines
Minimum 95 percent test coverage for impacted modules.
Clear, reviewer-focused documentation.