import CopyButton from "./CopyButton";
import { CONTRACT_ID, EXPLORER_URL, NETWORK } from "@/lib/config";

export default function ContractCard() {
  return (
    <div className="card">
      <div className="eyebrow">Soroban escrow · {NETWORK}</div>
      <h3 style={{ marginTop: 6 }}>Deployed escrow contract</h3>
      <p className="muted">Investor funds are held by this contract until the invoice settles.</p>
      <div className="contract">
        <span className="addr">{CONTRACT_ID}</span>
        <div className="btn-row">
          <CopyButton value={CONTRACT_ID} />
          <a className="btn btn-ghost" href={EXPLORER_URL} target="_blank" rel="noopener noreferrer">
            View on stellar.expert ↗
          </a>
        </div>
      </div>
    </div>
  );
}
