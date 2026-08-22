# Observability & Error Reporting

The LiquiFact frontend implements a client-side error logging boundary that reports to a pluggable sink. This ensures that any unhandled runtime errors in React components are gracefully caught, logged, and optionally forwarded to an external telemetry service.

## Core Components

- **Global Error Boundary**: `app/error.js` catches unhandled exceptions in the App Router and displays a generic fallback UI. It invokes `reportError(error, context)` whenever a crash occurs.
- **Error Reporter**: `lib/observability/reportError.js` is the adapter responsible for handling the caught error.

## Default Sink (Console)

By default, `reportError` logs errors to the browser console via `console.error`.

### Privacy & Security

The default console sink implements a shallow PII/secrets scrubber. If a `context` object is provided, keys that match sensitive terms (e.g., `password`, `token`, `secret`, `authorization`, `cookie`) will be scrubbed and replaced with `[REDACTED]` before logging.

_Note: This scrubber operates at the root level of the context object (shallow scrub). Be mindful of passing deeply nested sensitive data._

## Injecting a Custom Reporter

You can override the default sink to send error telemetry to a service like Sentry or Datadog.

To do this, use `setReporter(reporterFn)` during the application initialization phase.

```javascript
import { setReporter } from "@/lib/observability/reportError";
import * as Sentry from "@sentry/nextjs";

setReporter((error, context) => {
  Sentry.captureException(error, {
    extra: context,
  });
});
```
