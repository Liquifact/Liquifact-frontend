// Shared by playwright.config.mjs and the specs.
export const PORT = Number(process.env.E2E_PORT || 3100);
export const BASE_URL = `http://127.0.0.1:${PORT}`;

// The app is built and started with NEXT_PUBLIC_API_URL pointing here. Nothing
// listens on this port: specs answer every request to it with page.route, and
// the server-side render falls back to the demo invoices.
export const MOCK_API_URL = "http://127.0.0.1:4010";
