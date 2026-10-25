import RiskBadge from "./RiskBadge";

export default function RiskFactorsCard({ risk, className = "" }) {
  if (!risk || !risk.band) return null;

  const { band, score, factors = [] } = risk;

  return (
    <div className={`card risk-factors-card ${className}`.trim()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>Risk factors</h3>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.88rem" }}>
            Deterministic score: <strong>{score}</strong> / 100
          </p>
        </div>
        <RiskBadge band={band} score={score} factors={factors} />
      </div>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table" aria-label="Risk factor breakdown" style={{ minWidth: 420 }}>
          <thead>
            <tr>
              <th scope="col" style={{ width: "30%" }}>Factor</th>
              <th scope="col" style={{ width: "18%", textAlign: "right", whiteSpace: "nowrap" }}>Impact</th>
              <th scope="col">Assessment Details</th>
            </tr>
          </thead>
          <tbody>
            {factors.map((f) => {
              const pts = Number(f.points) || 0;
              const sign = pts > 0 ? `+${pts}` : `${pts}`;
              const impactClass = pts > 0 ? "risk-pts-pos" : pts < 0 ? "risk-pts-neg" : "risk-pts-zero";

              return (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.label}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`risk-pts ${impactClass}`}>{sign} pts</span>
                  </td>
                  <td className="muted">{f.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: "0.82rem", marginTop: 16, marginBottom: 0 }}>
        <strong>Methodology note:</strong> Indicative only, not credit advice. Risk bands (Low, Moderate, Elevated, High) are deterministically computed based on time horizon, funding pace, yield outliers, on-chain backing, and ticket size.
      </p>
    </div>
  );
}
