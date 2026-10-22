import InvoiceDetail from "./InvoiceDetail";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Invoice ${id}` };
}

export default async function InvoicePage({ params }) {
  const { id } = await params;
  return <InvoiceDetail id={id} />;
}
