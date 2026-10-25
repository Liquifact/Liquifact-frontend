const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export default function Loading() {
  return (
    <section className="section" aria-busy="true">
      <span style={srOnly}>Loading…</span>
      <div className="container">
        <div className="skeleton" style={{ height: 20, width: 120, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 42, width: 280, marginBottom: 24 }} />
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="skeleton" style={{ minHeight: 280 }} />
          <div className="skeleton" style={{ minHeight: 280 }} />
        </div>
      </div>
    </section>
  );
}
