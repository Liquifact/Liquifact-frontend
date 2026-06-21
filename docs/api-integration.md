# Frontend API Integration Contract

This document describes the API surface the LiquiFact frontend expects from the
backend. It is intentionally accurate to the current frontend state: the home
page health check and invoice upload already call the backend, while the invest
marketplace list and invoice detail routes are planned and still use mocked data.

## Base URL

The frontend reads the backend base URL from `NEXT_PUBLIC_API_URL`.

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

If the variable is not set, current components fall back to
`http://localhost:3001`.

All endpoint paths below are relative to this base URL unless noted otherwise.

## Status Model

Frontend surfaces should map backend outcomes into a small, predictable status
model:

| Status | Meaning | UI handling |
| --- | --- | --- |
| `success` | The request completed and the payload can be rendered. | Render the normal page state or a success toast. |
| `validation_error` | The request was rejected because the user input is invalid. | Use inline field messaging or `ErrorBanner` with the `validation` variant. |
| `server_error` | The backend returned a 5xx or unexpected failure. | Use `ErrorBanner` and keep destructive actions disabled until the user retries. |
| `network_error` | The request failed before a backend response was available. | Use `ErrorBanner` or a toast with retry guidance. |

Backend error responses should be JSON and copy-pasteable across endpoints:

```json
{
  "error": {
    "code": "invoice_invalid_pdf",
    "message": "Only PDF invoice files are accepted.",
    "details": {
      "field": "invoice"
    }
  }
}
```

Recommended HTTP mapping:

| HTTP status | `error.code` examples | Frontend treatment |
| --- | --- | --- |
| `400` | `invalid_query`, `invalid_file_type` | Validation copy near the related control. |
| `401` | `wallet_required`, `session_expired` | Prompt the user to connect or reconnect a wallet. |
| `404` | `invoice_not_found` | Not-found page or contextual empty state. |
| `413` | `file_too_large` | Upload validation error. |
| `422` | `invoice_unreadable`, `tokenization_failed` | `ErrorBanner` with next-step guidance. |
| `500` | `internal_error` | Server error banner and retry option. |
| `503` | `service_unavailable` | Temporary outage banner or toast. |

## Current Endpoint: `GET /health`

Used by `app/page.js` when the user clicks **Check backend health**.

### Request

```http
GET /health
```

### Success Response

```json
{
  "status": "ok",
  "message": "LiquiFact API is healthy",
  "version": "0.1.0"
}
```

The current home page renders the raw JSON payload after parsing it.

### Error Response

```json
{
  "error": {
    "code": "service_unavailable",
    "message": "LiquiFact API is temporarily unavailable."
  }
}
```

Planned hardening should keep non-JSON failures from crashing the UI and render a
clear connected, degraded, or unreachable state instead of only dumping JSON.

## Planned Endpoint: `GET /invoices`

The invest marketplace at `app/invest/page.js` currently renders mock invoices.
The backend list endpoint should match this item contract so the mock data can be
replaced without UI reshaping.

### Request

```http
GET /invoices
```

### Query Parameters

The filter query contract is defined in
[`FILTER_CONTRACTS.md`](../FILTER_CONTRACTS.md). The planned list endpoint should
support the same parameters:

| Parameter | Example | Meaning |
| --- | --- | --- |
| `yield_min` | `5` | Minimum expected yield percentage. |
| `yield_max` | `10` | Maximum expected yield percentage. |
| `currency` | `USD,EUR` | Comma-separated currency filter. |
| `maturity_from` | `2026-06-01` | Inclusive maturity-date lower bound. |
| `maturity_to` | `2026-12-31` | Inclusive maturity-date upper bound. |
| `sort` | `yield_desc` | One of `yield_desc`, `amount_asc`, `maturity_asc`. |

Future pagination should use stable parameters such as `page`, `page_size`, or
cursor-based `after`/`limit`. Pick one strategy before shipping a live list.

### Success Response

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
    "count": 1
  }
}
```

The invoice item shape must remain compatible with the current mock contract:

```ts
type MarketplaceInvoice = {
  id: string;
  issuer: string;
  amount: string;
  currency: string;
  dueDate: string;
  yield: string;
  status: string;
};
```

### Empty Response

```json
{
  "data": [],
  "meta": {
    "count": 0
  }
}
```

The frontend should surface this as `copy.invest.emptyState`:

> No investable invoices. Connect wallet to see the marketplace.

## Planned Endpoint: `GET /invoices/:id`

Invoice detail pages are planned. Use this endpoint for a single marketplace or
business invoice detail view.

### Request

```http
GET /invoices/inv-001
```

### Success Response

```json
{
  "id": "inv-001",
  "issuer": "Acme Supplies Ltd",
  "amount": "12,500",
  "currency": "USD",
  "dueDate": "2026-06-15",
  "yield": "8.2%",
  "status": "Open",
  "description": "Tokenized receivable for Acme Supplies Ltd.",
  "documents": [
    {
      "id": "doc-001",
      "name": "invoice.pdf",
      "contentType": "application/pdf"
    }
  ]
}
```

### Not Found Response

```json
{
  "error": {
    "code": "invoice_not_found",
    "message": "Invoice inv-001 could not be found."
  }
}
```

## Current Endpoint: `POST /invoices`

Used by `components/UploadZone.jsx` after the user chooses a PDF invoice.

### Request

```http
POST /invoices
Content-Type: multipart/form-data
```

Form fields:

| Field | Required | Description |
| --- | --- | --- |
| `invoice` | Yes | A single PDF file up to 10 MB. |

The current component enforces a PDF-only, 10 MB client-side constraint before
posting.

### Success Response

```json
{
  "id": "inv-004",
  "status": "queued",
  "message": "Invoice queued for tokenization.",
  "tokenizationDelay": 0
}
```

`tokenizationDelay` is optional. When present and greater than zero, the current
component briefly holds the UI in the tokenizing state before showing success.

### Validation Error Response

```json
{
  "error": {
    "code": "invalid_file_type",
    "message": "Only PDF invoice files are accepted.",
    "details": {
      "field": "invoice",
      "accepted": ["application/pdf"]
    }
  }
}
```

Current upload code looks for a top-level `message` when `res.ok` is false. For
forward compatibility, the backend may also include:

```json
{
  "message": "Only PDF invoice files are accepted.",
  "error": {
    "code": "invalid_file_type"
  }
}
```

## UI Error Surfaces

### `ErrorBanner`

Use `ErrorBanner` for page-level or panel-level failures that block a workflow:

- invoice list cannot load
- invoice detail is unavailable
- upload validation cannot be tied to a single input
- backend service is unavailable

`ErrorBanner` renders with `role="alert"` and `aria-live="assertive"`, so reserve
it for failures that require attention.

### `ToastProvider`

Use `ToastProvider` for transient outcomes:

- wallet connected successfully
- upload queued successfully
- non-blocking sync warning
- retry succeeded after a temporary failure

Toasts render in a polite live region. Keep toast messages short and do not use
them as the only place where critical workflow errors are explained.

## Contract Changelog

### 0.1.0 - 2026-06-21

- Documented the current `/health` and `POST /invoices` integration points.
- Added planned contracts for `/invoices` and `/invoices/:id`.
- Linked planned invoice filtering to `FILTER_CONTRACTS.md`.
- Captured shared error-response conventions for `ErrorBanner` and
  `ToastProvider` handling.
