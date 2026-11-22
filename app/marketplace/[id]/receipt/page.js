import Receipt from "./Receipt";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Funding receipt · ${id}`,
    description: `Printable on-chain funding receipt for invoice ${id}.`,
  };
}

export default async function ReceiptPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const txHash = typeof sp?.tx === "string" ? sp.tx.trim() : "";

  return <Receipt invoiceId={id} txHash={txHash} />;
}
