import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { copy } from "@/app/copy/en";

export default function EditableInvoiceRow({ invoice, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ ...invoice });
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const formRef = useRef(null);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft({ ...invoice });
    setError("");
    setAnnouncement("Edit cancelled");
  }, [invoice]);

  const handleSave = (e) => {
    e?.preventDefault();

    if (!draft.issuer || !draft.amount || !draft.dueDate) {
      setError("Issuer, amount, and maturity are required.");
      setAnnouncement("Save failed: Issuer, amount, and maturity are required.");
      return;
    }

    const amt = parseFloat(String(draft.amount).replace(/,/g, ""));
    if (isNaN(amt) || amt <= 0) {
      setError("Amount must be a positive number.");
      setAnnouncement("Save failed: Amount must be a positive number.");
      return;
    }

    setIsEditing(false);
    setError("");
    setAnnouncement("Invoice updated successfully");

    onSave({ ...draft, amount: String(draft.amount) });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isEditing) {
        handleCancel();
      }
    };
    if (isEditing) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, handleCancel]);

  const handleChange = (e) => {
    setDraft((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  if (isEditing) {
    return (
      <li className="rounded-xl border border-cyan-800 bg-slate-900 p-5">
        <form ref={formRef} onSubmit={handleSave} className="space-y-4">
          <div role="status" aria-live="polite" className="sr-only">
            {announcement}
          </div>

          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor={`edit-issuer-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Issuer
              </label>
              <input
                id={`edit-issuer-${invoice.id}`}
                name="issuer"
                value={draft.issuer}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>
            <div className="w-32">
              <label
                htmlFor={`edit-status-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Status
              </label>
              <select
                id={`edit-status-${invoice.id}`}
                name="status"
                value={draft.status}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Open">Open</option>
                <option value="Funded">Funded</option>
                <option value="Settled">Settled</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-start">
            <div className="w-24">
              <label
                htmlFor={`edit-currency-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Currency
              </label>
              <input
                id={`edit-currency-${invoice.id}`}
                name="currency"
                value={draft.currency}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="w-32">
              <label
                htmlFor={`edit-amount-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Amount
              </label>
              <input
                id={`edit-amount-${invoice.id}`}
                name="amount"
                value={draft.amount}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="w-24">
              <label
                htmlFor={`edit-yield-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Yield
              </label>
              <input
                id={`edit-yield-${invoice.id}`}
                name="yield"
                value={draft.yield}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="w-40">
              <label
                htmlFor={`edit-due-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Maturity
              </label>
              <input
                id={`edit-due-${invoice.id}`}
                name="dueDate"
                type="date"
                value={draft.dueDate}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <div className="flex items-center gap-3 mt-4 pt-2 border-t border-slate-800">
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/invest/${invoice.id}`}
          className="font-medium text-slate-100 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        >
          {invoice.issuer}
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 px-3 py-1 text-xs font-medium text-slate-400 hover:text-cyan-400 border border-slate-700 rounded transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            aria-label={`Edit ${invoice.issuer}`}
          >
            Edit
          </button>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-300">
            {invoice.status}
          </span>
        </div>
      </div>
      <div className="flex gap-6 text-sm text-slate-400">
        <span>
          {invoice.currency}&nbsp;{invoice.amount}
        </span>
        <span>
          {copy.invest.labelYield}
          {invoice.yield}
        </span>
        <span>
          {copy.invest.labelMaturity}
          {invoice.dueDate}
        </span>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </li>
  );
}
