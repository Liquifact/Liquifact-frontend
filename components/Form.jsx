import React from 'react';

/**
 * A generic form wrapper component that applies consistent styling
 * across the application.
 *
 * @param {Object} props
 * @param {Function} props.onSubmit - Submission handler
 * @param {React.ReactNode} props.children - Form contents
 * @param {string} [props.className] - Additional Tailwind classes
 * @param {boolean} [props.noValidate=true] - Defaults to true to allow custom validation
 */
export default function Form({
  onSubmit,
  children,
  className = '',
  noValidate = true,
  ...props
}) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate={noValidate}
      className={`rounded-xl border border-slate-800 bg-slate-900/50 p-6 ${className}`.trim()}
      {...props}
    >
      {children}
    </form>
  );
}
