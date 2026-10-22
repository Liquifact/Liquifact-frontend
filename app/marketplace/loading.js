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
        <div className="eyebrow">Marketplace</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>
          Invoices seeking funding
        </h1>
        <div className="grid grid-3" style={{ marginTop: 28 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      </div>
    </section>
  );
}
