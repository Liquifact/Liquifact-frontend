export const metadata = { title: "You’re offline" };

export default function OfflinePage() {
  return <section className="section">
    <div className="container center">
      <h1>You’re offline</h1>
      <p className="lead">This page hasn’t been saved yet. You can still browse the marketplace and invoices you’ve already visited.</p>
      <p className="muted">Reconnect to see current data or submit a transaction.</p>
      <a className="btn btn-ghost" href="/marketplace">Open saved marketplace</a>
    </div>
  </section>;
}
