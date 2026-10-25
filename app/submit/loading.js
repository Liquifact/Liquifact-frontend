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
      <div className="container grid grid-2" style={{ alignItems: "start", gap: 40 }}>
        <div>
          <div className="skeleton" style={{ height: 20, width: 100, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 44, width: "80%", marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 80, width: "100%" }} />
        </div>
        <div className="skeleton" style={{ minHeight: 360 }} />
      </div>
    </section>
  );
}
