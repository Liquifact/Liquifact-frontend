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
      <div className="container docs-layout">
        <div className="skeleton" style={{ minHeight: 220 }} />
        <div style={{ display: "grid", gap: 20 }}>
          <div className="skeleton" style={{ height: 48, width: "60%" }} />
          <div className="skeleton" style={{ minHeight: 400 }} />
        </div>
      </div>
    </section>
  );
}
