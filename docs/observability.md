# Observability & Error Reporting

The LiquiFact frontend implements route-level and root error boundaries that report unhandled exceptions to a pluggable sink. This ensures that runtime failures are gracefully caught, isolated to the relevant route segment, reported safely, and recoverable by the user.

## Core Components

- **Route Error Boundaries**:
  - `app/error.js`: Root segment error boundary for unhandled route errors.
  - `app/marketplace/error.js`: Catches errors when listing invoices in the marketplace.
  - `app/marketplace/[id]/error.js`: Isolates invoice detail view and escrow loading failures.
  - `app/submit/error.js`: Handles errors during the invoice submission wizard, reminding users about draft state.
  - `app/global-error.js`: Fallback with inline styles for critical root-layout failures.
- **Reusable Error UI**: `components/ErrorState.jsx` renders an accessible error card with automatic focus management to the heading, a collapsible technical details disclosure (rendering error digest, hiding stack traces in production), a "Try again" retry button, and a "Go home" link.
- **Error Reporter**: `lib/observability/reportError.js` provides `reportError(error, context)` and `setReporter(fn)`.

## Default Sink (Console)

By default, `reportError` logs errors to the browser console via `console.error(error, context)`.

### Privacy & Security (Sensitive Key Scrubbing)

The error reporter implements a shallow secrets scrubber. When a `context` object is provided, keys matching `/secret|token|password|seed|key/i` have their values replaced with `[REDACTED]` prior to dispatching to the reporter sink.

_Note: This scrubber operates at the root level of the context object (shallow scrub)._

### Custom Reporter Safety

You can override the default reporting sink using `setReporter(fn)`. If a custom reporter throws an exception during execution, `reportError` catches it safely so that error reporting never causes the application or error UI to crash.

## Injecting a Custom Reporter

You can override the default sink to send error telemetry to a service like Sentry or Datadog during application initialization:

```javascript
import { setReporter } from "@/lib/observability/reportError";

setReporter((error, context) => {
  // Forward to telemetry vendor
});
```
