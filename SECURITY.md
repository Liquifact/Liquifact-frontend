# Security Policy

Thank you for helping keep Liquifact safe. We take security reports seriously and ask that you follow this private disclosure process for any vulnerability you believe affects this repository or its deployments.

## Supported Versions

The project currently targets the latest `main` branch release and the most recent published release line. Older versions are not guaranteed to receive security fixes unless a specific issue is confirmed and a maintenance window is agreed.

| Version | Supported | Notes |
| --- | --- | --- |
| Latest `main` branch | ✅ | Active development and security fixes are expected here. |
| Latest published release | ✅ | The current supported release line receives security updates. |
| Older releases | ❌ | Security fixes are not guaranteed for older branches or historical releases. |

## Reporting a Vulnerability

Please report suspected vulnerabilities privately through the repository maintainer contact listed in this project documentation. Do not open a public issue or discuss the issue in public channels before maintainers have had a chance to investigate.

When reporting, please include:

- A clear description of the vulnerability and its impact
- Steps to reproduce the issue, including relevant environment details
- The affected version or branch
- Any proof of concept, logs, screenshots, or payloads that help validate the report
- The scope of the affected component, such as authentication, wallet integration, finance flows, or rendering logic

Please use a concise report format such as:

1. Summary
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Impact
6. Environment details

## Disclosure Process

We aim to respond professionally and promptly:

- We will acknowledge receipt of a report within 5 business days.
- We will provide an initial triage assessment within 10 business days.
- We will work toward a remediation plan or a clear status update as appropriate.
- We will coordinate disclosure with the reporter once a fix is available or the issue is otherwise resolved.

We ask reporters to allow us a reasonable window to investigate before publicly discussing the issue.

## Scope

### In Scope

We welcome reports for vulnerabilities involving:

- Authentication or authorization bypass
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Wallet integration or transaction handling issues
- Sensitive data exposure
- Dependency or package vulnerabilities that affect the project
- Security misconfiguration in the repository or deployment workflow

### Out of Scope

The following are generally out of scope unless they demonstrate a clear security impact:

- Social engineering or phishing attacks
- Denial of service without a demonstrated security impact
- Spam or low-risk nuisance reports
- Missing security headers on localhost or non-production environments
- Third-party service outages or upstream provider issues
- Duplicate reports already tracked or resolved

## Existing Security Controls

This repository documents its security posture in [docs/security.md](docs/security.md). Technical implementation details, audit notes, and policy references are maintained there rather than repeated in this file.

## Automated Security Checks

The repository uses automated checks in CI to provide a baseline level of security validation. These checks are not a substitute for responsible disclosure, but they help catch common issues early.

The current workflow includes:

- Gitleaks secret scanning
- `npm audit --audit-level=high` for dependency vulnerabilities
- Standard CI checks such as linting, formatting, build validation, and test execution
