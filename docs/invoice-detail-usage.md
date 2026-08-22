# Invoice Detail Usage Guide

This guide covers the invoice-detail components used to display individual invoice information. These components handle loading states, error recovery, and present invoice data in an accessible, formatted layout.

---

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [Data Contracts](#data-contracts)
- [Common Patterns](#common-patterns)
- [Accessibility](#accessibility)
- [Examples](#examples)

---

## Overview

The invoice-detail components are designed to display comprehensive invoice information in a presentational format. The main `InvoiceDetail` component:

- **Manages loading states** with an animated skeleton
- **Handles error states** with a dismissible ErrorBanner and retry mechanism
- **Formats data** using locale-aware currency, percentage, and date formatters
- **Supports accessibility** with proper ARIA attributes and semantic HTML
- **Provides copy functionality** for invoice reference IDs

The component uses an injectable `loadInvoice` prop for data fetching, making it testable and adaptable to different data sources.

---

## Core Components

### InvoiceDetail

Main presentational component that renders invoice details with loading and error states.

**File:** `components/InvoiceDetail.jsx`

#### Props

| Prop          | Type       | Required | Description                                                                 |
| ------------- | ---------- | -------- | --------------------------------------------------------------------------- |
| `id`          | `string`   | Yes      | Unique invoice identifier                                                   |
| `loadInvoice` | `function` | Yes      | Async function that resolves to an Invoice object. Injectable for testing. |

#### Behaviour

- Fetches invoice data on mount using `loadInvoice(id)`
- Shows loading skeleton while data is being fetched
- Displays error banner with retry button on failure
- Automatically refetches when the `id` prop changes
- Formats amounts using `formatCurrency` from `lib/format/currency.js`
- Formats percentages using `formatPercent` from `lib/format/currency.js`
- Formats dates using `formatInvoiceDate` from `lib/format/date.js`
- Includes copy button for invoice reference ID

#### Example

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";

// With custom loader
<InvoiceDetail
  id="inv-123"
  loadInvoice={fetchInvoiceFromApi}
/>
```

---

### InvoiceDetailSkeleton

Content-shaped placeholder shown while the invoice detail page is loading. Dimensions mirror the invoice detail layout to prevent layout shift.

**File:** `components/InvoiceDetailSkeleton.jsx`

#### Props

None - this is a stateless component.

#### Behaviour

- Renders a full-page skeleton matching the detail page structure
- Uses `aria-busy="true"` to indicate loading state to screen readers
- Includes screen reader text: "Loading invoice details, please wait…"
- Uses `animate-pulse` for visual loading indicator
- Hides all skeleton elements with `aria-hidden="true"` (screen readers read the live text instead)

#### Example

```jsx
import InvoiceDetailSkeleton from "@/components/InvoiceDetailSkeleton";

// Show while loading
{isLoading && <InvoiceDetailSkeleton />}
```

---

## Data Contracts

### Invoice Type

The invoice data shape expected by `InvoiceDetail`:

```javascript
/**
 * @typedef {Object} Invoice
 * @property {string}        id          - Unique invoice identifier
 * @property {string}        issuer      - Company name
 * @property {number|string} amount      - Invoice face value
 * @property {number|string} amountValue - Numeric amount value (takes precedence over amount)
 * @property {string}        currency    - ISO currency code (e.g., "USD", "EUR")
 * @property {number|string} yield       - Expected yield percentage (string fallback)
 * @property {number}        yieldValue  - Numeric yield value (takes precedence)
 * @property {string}        dueDate     - ISO 8601 date string (e.g., "2024-12-31")
 * @property {InvoiceStatus} status      - Status value
 */
```

### InvoiceStatus Union

The exhaustive set of status values:

```javascript
/**
 * @typedef {"Open" | "Funded" | "Settled" | "Overdue" | "pending"} InvoiceStatus
 */
```

### loadInvoice Function Signature

The data fetcher function must conform to this signature:

```javascript
/**
 * @param {string} id - Invoice identifier
 * @returns {Promise<Invoice|null>}
 */
async function loadInvoice(id) {
  // Fetch logic here
  return invoiceObject; // or null if not found
}
```

---

## Common Patterns

### Basic Usage with Mock Data

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";
import { getInvoiceById } from "@/app/invest/lib";

function InvoiceDetailPage({ params }) {
  const { id } = params;

  return (
    <InvoiceDetail
      id={id}
      loadInvoice={getInvoiceById}
    />
  );
}
```

### Custom API Integration

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";

async function fetchInvoiceFromApi(id) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch invoice: ${response.statusText}`);
  }
  return response.json();
}

function InvoiceDetailPage({ params }) {
  return (
    <InvoiceDetail
      id={params.id}
      loadInvoice={fetchInvoiceFromApi}
    />
  );
}
```

### Error Boundary Integration

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";
import ErrorBoundary from "@/components/ErrorBoundary";

function InvoiceDetailPage({ params }) {
  return (
    <ErrorBoundary fallback={<div>Something went wrong loading this invoice.</div>}>
      <InvoiceDetail
        id={params.id}
        loadInvoice={fetchInvoiceFromApi}
      />
    </ErrorBoundary>
  );
}
```

### Conditional Rendering Based on State

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";
import InvoiceDetailSkeleton from "@/components/InvoiceDetailSkeleton";

function InvoiceDetailPage({ params }) {
  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    fetchInvoiceFromApi(params.id)
      .then(setInvoice)
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) {
    return <InvoiceDetailSkeleton />;
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  return <InvoiceDetail id={params.id} loadInvoice={() => Promise.resolve(invoice)} />;
}
```

### Testing with Mock Loader

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";
import { render, screen } from "@testing-library/react";

const mockInvoice = {
  id: "inv-123",
  issuer: "Test Issuer",
  amountValue: 1000,
  currency: "USD",
  yieldValue: 5,
  dueDate: "2024-12-31",
  status: "Open",
};

const mockLoadInvoice = jest.fn().mockResolvedValue(mockInvoice);

test("renders invoice details", async () => {
  render(<InvoiceDetail id="inv-123" loadInvoice={mockLoadInvoice} />);
  
  await screen.findByText("Test Issuer");
  expect(screen.getByText("Invoice #inv-123")).toBeInTheDocument();
});
```

---

## Accessibility

### Loading State Announcements

The loading skeleton uses `aria-busy="true"` and `aria-live="polite"` to inform screen readers that content is loading:

```jsx
<div
  className="animate-pulse flex flex-col space-y-4 p-6 bg-white rounded shadow"
  data-testid="invoice-detail-skeleton"
  aria-busy="true"
  aria-live="polite"
>
  {/* Skeleton content */}
</div>
```

### Error Handling

Error states are announced via the `ErrorBanner` component which includes proper ARIA attributes. The retry button is keyboard accessible and clearly labeled.

### Semantic HTML

The component uses semantic markup:
- `<article>` for the invoice content
- `<header>` for the invoice title and status
- `<dl>`, `<dt>`, `<dd>` for definition lists (key-value pairs)
- `<h2>` with `aria-labelledby` for the invoice heading

### Focus Management

- Copy button includes proper `aria-label` for screen readers
- All interactive elements are keyboard navigable
- Error dismiss and retry buttons are clearly labeled

### Colour Independence

Status information is conveyed through text and the `StatusPill` component, not colour alone. The `StatusPill` includes accessible labels.

---

## Examples

### Complete Invoice Detail Page Implementation

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";
import { getInvoiceById } from "@/app/invest/lib";

export default function InvoiceDetailPage({ params }) {
  const { id } = params;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <InvoiceDetail
        id={id}
        loadInvoice={getInvoiceById}
      />
    </main>
  );
}
```

### With Custom Error Handling

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";
import { getInvoiceById } from "@/app/invest/lib";

async function loadInvoiceWithErrorHandling(id) {
  try {
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }
    return invoice;
  } catch (error) {
    // Log to error tracking service
    console.error("Failed to load invoice:", error);
    throw error;
  }
}

export default function InvoiceDetailPage({ params }) {
  return (
    <InvoiceDetail
      id={params.id}
      loadInvoice={loadInvoiceWithErrorHandling}
    />
  );
}
```

### With Data Transformation

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";

async function loadAndTransformInvoice(id) {
  const rawInvoice = await fetchInvoiceFromApi(id);
  
  // Transform API response to component shape
  return {
    id: rawInvoice.invoice_id,
    issuer: rawInvoice.company_name,
    amountValue: rawInvoice.face_value,
    currency: rawInvoice.currency_code,
    yieldValue: rawInvoice.expected_yield,
    dueDate: rawInvoice.maturity_date,
    status: rawInvoice.current_status,
  };
}

export default function InvoiceDetailPage({ params }) {
  return (
    <InvoiceDetail
      id={params.id}
      loadInvoice={loadAndTransformInvoice}
    />
  );
}
```

### Integration with Next.js App Router

```jsx
// app/invest/[id]/page.js
import InvoiceDetail from "@/components/InvoiceDetail";
import { getInvoiceById } from "@/app/invest/lib";

export default function InvoiceDetailPage({ params }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold">Invoice Details</h1>
      </header>
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        <InvoiceDetail
          id={params.id}
          loadInvoice={getInvoiceById}
        />
      </main>
    </div>
  );
}
```

### Using with Different Data Sources

```jsx
import InvoiceDetail from "@/components/InvoiceDetail";

// Load from GraphQL API
async function loadInvoiceFromGraphQL(id) {
  const query = `
    query GetInvoice($id: ID!) {
      invoice(id: $id) {
        id
        issuer
        amountValue
        currency
        yieldValue
        dueDate
        status
      }
    }
  `;
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id } }),
  });
  
  const { data } = await response.json();
  return data.invoice;
}

// Load from REST API
async function loadInvoiceFromREST(id) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${id}`);
  return response.json();
}

// Choose loader based on environment
const loadInvoice = process.env.USE_GRAPHQL 
  ? loadInvoiceFromGraphQL 
  : loadInvoiceFromREST;

export default function InvoiceDetailPage({ params }) {
  return (
    <InvoiceDetail
      id={params.id}
      loadInvoice={loadInvoice}
    />
  );
}
```

---

## Related Documentation

- [Invoice detail data flow](invoice-detail-data-flow.md) - Architecture and data transformation pipeline
- [Invoice detail flow](invoice-detail-flow.md) - End-to-end flow diagram
- [Invoice data contract](invoice-data.md) - Field contract and API migration
- [Marketplace usage guide](marketplace.md) - Related marketplace components
- [Accessibility guide](accessibility.md) - A11y patterns and testing
- [Component Library Reference](../COMPONENTS.md) - Full component API
