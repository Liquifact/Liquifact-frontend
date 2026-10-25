export function RiskIcon({ band }) {
  switch (band) {
    case "Low":
      // Shield with checkmark - distinct geometric shield shape
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 1.5l6 2.5v4.5c0 4-2.5 6.5-6 7.5-3.5-1-6-3.5-6-7.5V4l6-2.5z" />
          <path d="M5.5 8l2 2 3.5-3.5" />
        </svg>
      );
    case "Moderate":
      // Diamond shape - distinct 4-point diamond
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <polygon points="8,1 15,8 8,15 1,8" />
        </svg>
      );
    case "Elevated":
      // Warning triangle - distinct 3-point upward triangle
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <polygon points="8,1.5 15.5,14.5 0.5,14.5" />
        </svg>
      );
    case "High":
      // Alert octagon - distinct 8-point stop shape
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <polygon points="5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function RiskBadge({ band, score, factors = [], className = "" }) {
  if (!band) return null;

  const topFactors = factors && factors.length > 0
    ? factors
        .slice()
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
        .slice(0, 3)
        .map((f) => `${f.label} (${f.points >= 0 ? `+${f.points}` : f.points} pts): ${f.detail}`)
        .join("; ")
    : `Risk assessed as ${band}`;

  const tooltip = `Why? ${topFactors}`;
  const bandKey = band.toLowerCase();

  return (
    <span
      role="status"
      aria-label={`Risk: ${band}`}
      title={tooltip}
      className={`badge badge-risk badge-risk-${bandKey} ${className}`.trim()}
    >
      <RiskIcon band={band} />
      <span>{band}</span>
      {typeof score === "number" && (
        <span className="risk-score-pill" aria-hidden="true">
          {score}
        </span>
      )}
    </span>
  );
}
