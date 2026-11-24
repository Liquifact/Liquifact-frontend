import { test as base, expect } from "@playwright/test";
import { MOCK_API_URL } from "./constants.mjs";

// Deliberately different from lib/demo.js so a test can tell mocked data from
// the offline fallback.
export const INVOICES = [
  { id: "INV_E2E_1", sme: "E2E Alpha Foods", debtor: "Delta Retail", amount: 20000, currency: "USDC", fundedAmount: 5000, yieldBps: 800, dueDate: "2027-03-15", status: "open", onChain: false },
  { id: "INV_E2E_2", sme: "E2E Bravo Textiles", debtor: "Echo Wholesale", amount: 15000, currency: "USDC", fundedAmount: 15000, yieldBps: 700, dueDate: "2027-02-10", status: "funded", onChain: false },
  { id: "INV_E2E_3", sme: "E2E Charlie Logistics", debtor: "Foxtrot Foods", amount: 9000, currency: "XLM", fundedAmount: 9000, yieldBps: 900, dueDate: "2027-01-20", status: "settled", onChain: false },
  { id: "INV_E2E_4", sme: "E2E Delta Tools", debtor: "Golf Supply", amount: 12000, currency: "USDC", fundedAmount: 0, yieldBps: 650, dueDate: "2027-04-01", status: "open", onChain: false },
];

export const CREATED_ID = "INV_E2E_NEW";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

/**
 * Route-mocked LiquiFact API. Tweak the returned object before navigating:
 *   api.offline = true            -> every request fails like a dead network
 *   api.createResponse = {...}    -> override the POST /api/invoices reply
 * api.created holds the JSON bodies POSTed to /api/invoices.
 */
async function mockApi(page) {
  const api = {
    invoices: [...INVOICES],
    created: [],
    requests: [],
    offline: false,
    createResponse: null,
  };

  await page.route(`${MOCK_API_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status, body) =>
      route.fulfill({ status, contentType: "application/json", headers: CORS_HEADERS, body: JSON.stringify(body) });

    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    api.requests.push(`${request.method()} ${url.pathname}${url.search}`);
    if (api.offline) return route.abort("connectionrefused");

    if (url.pathname === "/api/invoices" && request.method() === "GET") {
      const status = url.searchParams.get("status");
      return json(200, { data: status ? api.invoices.filter((i) => i.status === status) : api.invoices });
    }
    if (url.pathname === "/api/invoices" && request.method() === "POST") {
      const body = request.postDataJSON();
      api.created.push(body);
      if (api.createResponse) return json(api.createResponse.status, api.createResponse.body);
      const invoice = { ...body, id: CREATED_ID, status: "open", fundedAmount: 0, onChain: false };
      api.invoices = [...api.invoices, invoice];
      return json(201, { data: invoice });
    }
    const detail = url.pathname.match(/^\/api\/invoices\/([^/]+)$/);
    if (detail && request.method() === "GET") {
      const invoice = api.invoices.find((i) => i.id === decodeURIComponent(detail[1]));
      return invoice ? json(200, { data: invoice }) : json(404, { error: "Invoice not found" });
    }
    if (url.pathname === "/health") return json(200, { status: "ok" });
    return json(404, { error: `Not mocked: ${url.pathname}` });
  });

  return api;
}

export const test = base.extend({
  // auto: the mock must be active even in tests that never mention `api`.
  api: [
    async ({ page }, use) => {
      await use(await mockApi(page));
    },
    { auto: true },
  ],

  // Runs for every test: fails it on any CSP violation or uncaught page error
  // (which includes React hydration errors).
  pageHealth: [
    async ({ page }, use) => {
      const cspViolations = [];
      const pageErrors = [];

      await page.exposeFunction("__e2eReportCsp", (v) => cspViolations.push(v));
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => {
          window.__e2eReportCsp?.(`${e.disposition} ${e.violatedDirective} blocked=${e.blockedURI} source=${e.sourceFile}`);
        });
      });
      page.on("console", (msg) => {
        if (/content security policy/i.test(msg.text())) cspViolations.push(`console: ${msg.text()}`);
      });
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await use();

      expect(cspViolations, "CSP violations logged by the browser").toEqual([]);
      expect(pageErrors, "uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
