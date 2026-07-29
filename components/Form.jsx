import React, { useId } from "react";
import { toErrorList } from "@/lib/validation/forms";

/**
 * A generic form wrapper component that applies consistent styling
 * across the application.
 *
 * When an `errors` map is supplied the form additionally renders an accessible
 * error summary and blocks submission while any error is active. Omitting
 * `errors` preserves the original behaviour exactly.
 *
 * @param {Object} props
 * @param {Function} props.onSubmit - Submission handler
 * @param {React.ReactNode} props.children - Form contents
 * @param {string} [props.className] - Additional Tailwind classes
 * @param {boolean} [props.noValidate=true] - Defaults to true to allow custom validation
 * @param {Object|null} [props.errors] - Map of field name to error message
 * @param {string} [props.errorSummaryTitle] - Heading for the error summary
 */
export default function Form({
  onSubmit,
  children,
  className = "",
  noValidate = true,
  errors = null,
  errorSummaryTitle = "Please fix the following before continuing:",
  ...props
}) {
  const summaryId = useId();
  const errorList = toErrorList(errors);
  const hasErrors = errorList.length > 0;

  const handleSubmit = (event) => {
    // Block submission while the form is known to be invalid. The server-side
    // checks still run; this only avoids a guaranteed-failing round trip.
    if (hasErrors) {
      event.preventDefault();
      return;
    }
    if (onSubmit) onSubmit(event);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate={noValidate}
      className={`rounded-xl border border-slate-800 bg-slate-900/50 p-6 ${className}`.trim()}
      aria-describedby={hasErrors ? summaryId : undefined}
      {...props}
    >
      {hasErrors && (
        <div
          id={summaryId}
          role="alert"
          className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
        >
          <p className="font-medium">{errorSummaryTitle}</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map(({ field, message }) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </form>
  );
}
