import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container center">
        <div className="eyebrow">404</div>
        <h1 style={{ fontSize: "2.2rem" }}>Page not found</h1>
        <p className="lead">The page you’re looking for doesn’t exist or has moved.</p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn btn-primary">Home</Link>
          <Link href="/marketplace" className="btn btn-ghost">Marketplace</Link>
          <Link href="/docs" className="btn btn-ghost">Docs</Link>
        </div>
      </div>
    </section>
  );
}
