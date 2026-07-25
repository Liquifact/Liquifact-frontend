# Frontend API Integration Contract

## Purpose

This document explains how the LiquiFact frontend communicates with the Express backend, outlines the relationship between the two, describes the current mocked state of the application, and serves as the official integration contract for future backend development.

## Base URL Configuration

The frontend determines the backend API URL using the `NEXT_PUBLIC_API_URL` environment variable.

Example configuration in local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

In the codebase, this is typically read as follows:

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
fetch(`${API_URL}/health`);
```

This variable should be overridden in staging and production environments to point to the respective backend deployment URLs.

## Relationship to FILTER_CONTRACTS.md

For details regarding query parameter conventions and filter controls implementation, please reference the [FILTER_CONTRACTS.md](../FILTER_CONTRACTS.md) document.

This document focuses on the HTTP payloads, endpoint contracts, and data models for frontend-backend communication.

---

## Current Implementation

The endpoints listed in this section reflect the existing code paths that are actively used in the frontend application today.

### Health Check

> Status: Implemented Today

**Method:** `GET /health`

**Purpose:** Validate backend availability. This is currently invoked on the homepage to display the API status.

**Example request:**

```http
GET /health
```

**Example success response:**

```json
{
  "status": "ok"
}
```

### Upload Invoice

> Status: Implemented Today

**Method:** `POST /invoices`

**Purpose:** Upload and queue an invoice file for tokenization. This is actively used in the `UploadZone` component.

**Request:**

```http
Content-Type: multipart/form-data
```

**Fields:**

- `invoice`: `<invoice document (PDF)>`

**Example using curl:**

```bash
curl -X POST -F "invoice=@invoice.pdf" http://localhost:3001/invoices
```

**Example success response:**

```json
{
  "message": "Upload successful",
  "tokenizationDelay": 1500
}
```

---

## Mock Data Wiring

The frontend currently uses mock invoice data during development. All mock invoice
fixtures are defined **exclusively** in `app/invest/lib.js` — this is the single source
of truth until the real backend `/invoices` endpoint is wired up (see _Retrieve Invoices_
below).

### Source

- **Fixture source**: `app/invest/lib.js` — exports `MOCK_INVOICES` (the canonical array),
  `loadMockInvoices` (the async loader used as the default `loadInvoices` prop in
  `InvestMarketplace`), and `getInvoiceById` (used by the detail route `app/invest/[id]`).
  Do **not** redeclare these fixtures inline in any other module.
- **Health helper**: `lib/api/health.js` provides a real fetch wrapper for the health check.

### Test hook

`loadMockInvoices` checks `window.__TEST_MOCK_INVOICES__` before returning the canonical
array. Playwright and Jest tests can override the fixture at runtime by setting this
global before the component mounts. The override is ignored in non-browser (SSR)
environments and has no effect in production builds.

### Consumption

- `app/invest/page.js` imports `loadMockInvoices` from `./lib` and passes it as the
  default value for the `loadInvoices` prop of `InvestMarketplace`.
- `app/invest/[id]/page.js` calls `getInvoiceById` from `./lib` for the detail view.
- Tests import `MOCK_INVOICES`, `loadMockInvoices`, and `getInvoiceById` from `./lib`
  to assert against the shared fixture directly.

### Swapping to the real API

When the backend is ready, replace the default prop in `InvestMarketplace`:

```js
// Before (mock)
import { loadMockInvoices } from "./lib";
export function InvestMarketplace({ loadInvoices = loadMockInvoices }) { … }

// After (real API)
import { fetchInvestableInvoices } from "../../lib/api/invoices";
export function InvestMarketplace({ loadInvoices = fetchInvestableInvoices }) { … }
```

No other files need to change — the injectable `loadInvoices` prop keeps the mock and
production paths fully interchangeable.

---

## Invoice Resource Contract

The canonical invoice object used in the frontend UI requires the following shape to render correctly in the investment marketplace.

**Canonical object example:**

```json
{
  "id": "inv-001",
  "issuer": "Acme Supplies Ltd",
  "amount": "12,500",
  "currency": "USD",
  "dueDate": "2026-06-15",
  "yield": "8.2%",
  "status": "Open"
}
```

**Field Details:**

| Field      | Type           | Required | Description                                                                               |
| ---------- | -------------- | -------- | ----------------------------------------------------------------------------------------- |
| `id`       | String         | Yes      | Unique identifier for the invoice                                                         |
| `issuer`   | String         | Yes      | Name of the issuing entity                                                                |
| `amount`   | String/Numeric | Yes      | The invoice amount (formatted string with commas in mock, can adapt to numeric in future) |
| `currency` | String         | Yes      | ISO currency code (e.g., USD, EUR)                                                        |
| `dueDate`  | String         | Yes      | Maturity date in ISO-8601 format (YYYY-MM-DD)                                             |
| `yield`    | String/Numeric | Yes      | Estimated yield percentage                                                                |
| `status`   | String         | Yes      | Current state of the invoice. Documented value in UI mock: "Open"                         |

_Note: The frontend currently renders the `amount` and `yield` as strings, but a robust API integration should ideally provide these as numbers (e.g. `amount: 12500`, `yield: 8.2`) leaving formatting to the frontend presentation layer. For now, strings are shown based on the current mocked state._

### Normalization Contract

`fetchInvestableInvoices` (`lib/api/invoices.js`) is the single boundary that
maps a raw backend payload onto the canonical shape above. Its guarantees,
pinned by `lib/api/invoices.test.ts`:

- **Every field is always present.** Each missing field — and every field of a
  `null`/non-object entry — is defaulted to `null`.
- **Only contract fields survive.** Unknown extra keys in the raw payload are
  dropped, so malformed payloads cannot inject unexpected fields downstream.
- **`yield` is mapped through verbatim** to the UI `yield` field.
- **Error paths throw documented messages:** `Failed to fetch invoices: …` (not
  OK), `Response is not valid JSON` (bad body), and `Invoice payload is not an
  array` (non-array body).

---

## Planned Backend Endpoints

These endpoints are **not** fully wired into the frontend today but represent the expected integration contract for the marketplace and invoice listings.

### Retrieve Invoices

> Status: Planned Future Integration

**Method:** `GET /invoices`

**Purpose:** Retrieve invoice listings for the investment marketplace.

**Query params:** Reference [FILTER_CONTRACTS.md](../FILTER_CONTRACTS.md) for supported filter and sort parameters.

**Example request:**

```http
GET /invoices?status=Open&page=1
```

**Example success response:**

```json
{
  "data": [
    {
      "id": "inv-001",
      "issuer": "Acme Supplies Ltd",
      "amount": "12,500",
      "currency": "USD",
      "dueDate": "2026-06-15",
      "yield": "8.2%",
      "status": "Open"
    }
  ],
  "meta": {
    "page": 1,
    "total": 1
  }
}
```

### Retrieve Single Invoice

> Status: Planned Future Integration

**Method:** `GET /invoices/:id`

**Purpose:** Retrieve details for a single invoice.

**Example request:**

```http
GET /invoices/inv-001
```

**Example success response:**

```json
{
  "data": {
    "id": "inv-001",
    "issuer": "Acme Supplies Ltd",
    "amount": "12,500",
    "currency": "USD",
    "dueDate": "2026-06-15",
    "yield": "8.2%",
    "status": "Open"
  }
}
```

---

## Error Handling Contract

The frontend relies on standard error responses and HTTP status codes to surface issues to users appropriately.

### Standard Error Response Shape

APIs should return error responses matching the following structure:

```json
{
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "Invoice not found"
  }
}
```

**Optional Validation Error Shape:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {
      "field": "invoice"
    }
  }
}
```

_(Alternatively, simple `{"message": "Upload failed"}` is supported for compatibility with current `UploadZone` logic.)_

### HTTP Status Codes

| HTTP Status | Meaning                  | Frontend Behavior                                 |
| ----------- | ------------------------ | ------------------------------------------------- |
| `400`       | Bad Request / Validation | Show validation details or standard error message |
| `401`       | Unauthorized             | Prompt login or wallet connection                 |
| `403`       | Forbidden                | Show access denied message                        |
| `404`       | Not Found                | Show not found state                              |
| `422`       | Unprocessable Entity     | Highlight invalid fields (e.g., in upload forms)  |
| `429`       | Too Many Requests        | Show rate limit warning, encourage retry later    |
| `500`       | Internal Server Error    | Show generic failure message                      |
| `503`       | Service Unavailable      | Show temporary outage message                     |

### Frontend Error Surfacing Guidance

The application uses two distinct components to display errors to users:

- **ErrorBanner**: Use for persistent page-level failures. Network failures, failed page initialization (like an inability to load the invoice marketplace), or when the backend is entirely unavailable should use `ErrorBanner`.
- **ToastProvider**: Use for transient user actions and mutation outcomes. If an upload succeeded or failed, or for brief retry notifications, use `ToastProvider` via the `useToast` hook.

---

## Request Timeout Handling

`fetchInvestableInvoices` (in `lib/api/invoices.js`) protects the Invest marketplace against hung backends by aborting the request after a configurable deadline using the browser's `AbortController` API.

### Default timeout

The default is **10 000 ms (10 s)**. Pass `timeoutMs` to override it per call-site:

```js
import { fetchInvestableInvoices } from "@/lib/api/invoices";

// Use the default 10-second timeout
const invoices = await fetchInvestableInvoices();

// Custom 5-second timeout for a latency-sensitive context
const invoices = await fetchInvestableInvoices({ timeoutMs: 5000 });
```

### Composing with a caller signal

Callers may supply their own `AbortSignal` (e.g. tied to a React `useEffect` cleanup) alongside the timeout. Both are honoured simultaneously — whichever fires first cancels the request:

```js
const controller = new AbortController();

// In a React component:
useEffect(() => {
  fetchInvestableInvoices({ signal: controller.signal })
    .then(setInvoices)
    .catch(handleError);
  return () => controller.abort(); // fires on unmount
}, []);
```

### Distinguishing timeout from caller abort

When the timeout fires the function throws an `InvoiceTimeoutError` (a named subclass of `Error`). When the caller's signal fires it re-throws the original `AbortError` so the caller can tell the two apart:

```js
import { fetchInvestableInvoices, InvoiceTimeoutError } from "@/lib/api/invoices";

try {
  const invoices = await fetchInvestableInvoices({ signal, timeoutMs: 8000 });
} catch (err) {
  if (err instanceof InvoiceTimeoutError) {
    // Show retryable banner — backend did not respond in time.
  } else if (err?.name === "AbortError") {
    // Component unmounted or caller cancelled — suppress the error.
  } else {
    // Network / status / payload error — surface to the user.
  }
}
```

The `InvoiceTimeoutError` is retryable. The marketplace's error state already exposes a retry action and should treat this error class the same way it treats generic network failures.

### No state leak on abort

The internal `AbortController` is created fresh per call. The timeout handle is always cleared in a `finally` block, so no timer or listener persists after the function resolves, rejects, or is aborted.

---

## Network Failure Scenarios

Handling network-level and unpredictable failures is critical to maintaining a robust user experience:

- **Timeout / Offline**: If a request times out, `fetchInvestableInvoices` throws an `InvoiceTimeoutError`. Callers should show a retryable `ErrorBanner` with a prompt to retry or check their connection. See [Request Timeout Handling](#request-timeout-handling) above.
- **Invalid JSON**: If the backend returns malformed JSON or an unexpected HTML response (such as from a proxy error), the frontend parser will fail. These should be caught as generic parsing errors and handled as persistent page-level failures (`ErrorBanner`).
- **Unreachable Backend**: Triggered when the server is down or `NEXT_PUBLIC_API_URL` points to an invalid host. The `Check API Health` feature will catch this gracefully, but data-fetching pages like the marketplace will need to render a fallback error state (`ErrorBanner`).
- **Missing `NEXT_PUBLIC_API_URL`**: The app defaults to `http://localhost:3001` if this variable is unset. If the local backend is not running, it will result in an "Unreachable Backend" scenario.

---

## Payload Safety & Truncation Guards

To prevent client-side performance degradation or Denial of Service (DoS) attacks from oversized or deeply nested backend payloads, the frontend uses safety guards in the `lib/format/safeJson` utility module.

### Safe JSON Formatting Utilities

These utilities clean, depth-limit, and truncate data before rendering or parsing:

- **`truncateString(value, maxLength)`**: Limits the character length of a coerced string (default: 2000 characters). If the string exceeds the limit, it is sliced and appended with a `…(truncated)` marker.
- **`limitDepth(obj, maxDepth)`**: Traverses an object or array and replaces any node nesting deeper than `maxDepth` (default: 5) with `"[Depth limit reached]"`. It also detects circular references and replaces them with `"[Circular]"` to prevent serialization crashes.
- **`extractKnownFields(obj, fields)`**: Filters an object to only include specified allowed keys (default: `['status', 'message', 'version']`), ignoring other fields.
- **`safeJsonStringify(obj, options)`**: Wraps the depth limitation, standard serialization, and truncation workflows into a single helper. In case of unexpected serialization errors (e.g. nested BigInts), it gracefully falls back to a plain string representation of the object.

---

## Contract Version

**Version:** v1.2
**Last updated:** 2026-06-29

This contract reflects the mocked frontend state as of today and sets the baseline for the upcoming full backend integration.

## Mock Data Architecture
- All mock invoice fixtures are sourced from `app/invest/lib.js`. 
- Please do not define duplicate mock arrays in UI components.
