export default function StatusBadge({ status, label }) {
  return <span className={`badge badge-${status}`}>{label ?? status}</span>;
}
