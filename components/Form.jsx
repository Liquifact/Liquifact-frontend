import React from "react";

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
  errorSummaryTitle = "Please fix the following errors:",
  ...props
}) {
  const summaryId = "form-errors-summary";
  const errorList = errors
    ? Object.entries(errors).map(([field, message]) => ({ field, message }))
    : [];
  const hasErrors = errorList.length > 0;

  const handleSubmit = (e) => {
    if (hasErrors) {
      e.preventDefault();
      return;
    }
    if (onSubmit) onSubmit(e);
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
