# Invoice detail component contract

This note documents the current invoice-detail route contract implemented by [app/invest/[id]/page.js](../app/invest/[id]/page.js) and [app/invest/[id]/FundActions.jsx](../app/invest/[id]/FundActions.jsx). It focuses on the public API that is actually implemented today, rather than a broader design proposal.

## Overview

The invoice-detail experience is a route-level view for a single invoice. The server-rendered page shell provides the page structure, invoice summary, status timeline, and JSON-LD metadata, while the client-side actions component adds the interactive fund, copy-link, and print controls.

Use this view when you need to render one invoice record with its status timeline and the supporting actions that let a user fund, share, or print the invoice.

## Public props

The route-level page component is the primary public surface for this feature. It accepts a single `params` prop and does not expose any other custom props.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `params` | `Promise<{ id: string }> \| { id: string }` | Yes | None | The route params passed by Next.js. The page resolves the invoice ID from `params.id`. |

The client-side action component, `FundActions`, accepts the following props:

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | `string` | Yes | None | Invoice identifier used to build the shareable `/invest/{id}` URL. |
| `status` | `string` | Yes | None | Current invoice lifecycle state. The fund action is disabled unless the status is `"Open"`. |
| `maxAmount` | `number \| null` | No | `undefined` | Maximum funding amount for the partial-funding input. When present and the invoice is open, the funding input is rendered. |
| `currency` | `string` | No | `undefined` | Currency code used by the funding UI. |
| `yieldValue` | `number \| null` | No | `undefined` | Yield value used by the funding input preview. |

## Component states

The current implementation supports the following UI states:

- **Loaded / populated invoice**: Renders the invoice summary, status pill, timeline, and action buttons.
- **Not found**: If the invoice cannot be resolved from the route ID, the page calls `notFound()` and the standard not-found boundary is shown.
- **Open invoice with funding input**: When `status === "Open"` and `maxAmount` is present, the funding amount input is shown.
- **Disabled funding state**: When the wallet is connecting, no wallet is available, or the invoice is not open, the fund button is disabled.
- **Copy / print feedback**: The copy action shows toast feedback; the print action triggers the browser print dialog.

The page does not currently implement a separate loading skeleton or explicit error banner component for the route itself; those states are handled by the surrounding app-level boundaries and data-loading conventions.

## Minimal usage example

```jsx
import InvoiceDetailPage from "app/invest/[id]/page";

export default async function Page({ params }) {
  return InvoiceDetailPage({ params });
}
```

For the client-side action surface, the current component is used through the server-rendered page shell:

```jsx
<FundActions
  id={invoice.id}
  status={invoice.status}
  maxAmount={invoice.amountValue}
  currency={invoice.currency}
  yieldValue={invoice.yieldValue}
/>
```

## Notes

- The route relies on the invoice object returned by `getInvoiceById(id)` from [app/invest/lib.js](../app/invest/lib.js).
- The server page renders the invoice summary and timeline; the action component is intentionally isolated behind a client boundary.
- The print action uses `window.print()` and is keyboard accessible.
- Accessibility remains a priority: buttons use `type="button"`, the print button has an accessible label, and the page keeps the existing focus-visible ring styling.
