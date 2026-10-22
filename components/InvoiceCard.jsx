import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { bpsToPercent, formatAmount, formatDate, fundedPercent } from "@/lib/format";

export default function InvoiceCard({ invoice }) {
  const pct = fundedPercent(invoice);
  return (
    <Link href={`/marketplace/${invoice.id}`} className="card invoice-card">
      <div className="invoice-head">
        <div>
          <div className="invoice-id">{invoice.id}</div>
          <h3 style={{ margin: "4px 0 0" }}>{invoice.sme}</h3>
          <div className="muted" style={{ fontSize: "0.9rem" }}>Debtor: {invoice.debtor}</div>
        </div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <StatusBadge status={invoice.status} />
          {invoice.onChain && <span className="badge badge-chain">on-chain</span>}
        </div>
      </div>
      <div className="kv">
        <div><span className="k">Face value</span>{formatAmount(invoice.amount, invoice.currency)}</div>
        <div><span className="k">Yield</span>{bpsToPercent(invoice.yieldBps)}</div>
        <div><span className="k">Due</span>{formatDate(invoice.dueDate)}</div>
        <div><span className="k">Funded</span>{pct}%</div>
      </div>
      <div className="progress" aria-label={`${pct}% funded`}><span style={{ width: `${pct}%` }} /></div>
    </Link>
  );
}
