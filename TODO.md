# Test Fix TODO

- [x] Fix UploadZone: fallback when API_URL is undefined; ensure role="status" states render progress copy expected by tests.
- [x] Fix WalletStatus: allow rendering without WalletProvider (no throw from useWallet) for a11y test.
- [x] Fix WalletStatus: ensure NO_WALLET button accessible name matches "Install Stellar Wallet".
- [x] Fix app/sitemap.test.tsx & app/robots.test.tsx: ensure global.Request polyfill executes before importing route modules.
- [x] Fix WalletStatus.lazy.test.tsx: remove out-of-scope React reference inside jest.mock factory.
- [x] Re-run full test suite and iterate until green.
