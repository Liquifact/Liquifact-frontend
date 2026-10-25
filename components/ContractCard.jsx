import CopyButton from "./CopyButton";
import { explorerContractUrl, NETWORK } from "@/lib/config";

export { explorerContractUrl };

export default function ContractCard({ contractId, network = NETWORK }) {
  if (!contractId) return null;
  const explorerUrl = explorerContractUrl(contractId, network);

  return (
    <div className="card">
      <div className="eyebrow">Soroban escrow · {network}</div>
      <h3 style={{ marginTop: 6 }}>Deployed escrow contract</h3>
      <p className="muted">Investor funds are held by this contract until the invoice settles.</p>
      <div className="contract">
        <span className="addr">{contractId}</span>
        <div className="btn-row">
          <CopyButton value={contractId} />
          <a className="btn btn-ghost" href={explorerUrl} target="_blank" rel="noopener noreferrer">
            View on stellar.expert ↗
          </a>
        </div>
      </div>
    </div>
  );
}
