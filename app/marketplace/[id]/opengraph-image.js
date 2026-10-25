import { ImageResponse } from "next/og";
import { fetchInvoiceById } from "@/lib/invoiceSeoData";
import { cleanText, yieldPercent } from "@/lib/seo";
import { formatAmount, fundedPercent } from "@/lib/format";

export const alt = "LiquiFact invoice investment details";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function InvoiceOpenGraphCard({ invoice, id }) {
  const issuer = cleanText(invoice?.sme ?? invoice?.issuer, "Invoice unavailable");
  const invoiceId = cleanText(invoice?.id ?? id, "Invoice");
  const currency = cleanText(invoice?.currency, "USDC");
  const amount = invoice ? formatAmount(invoice.amount, currency) : "Invoice not found";
  const rate = invoice ? yieldPercent(invoice) : null;
  const funded = invoice ? Math.round(fundedPercent(invoice)) : 0;
  const status = cleanText(invoice?.status, "Unavailable");

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
        color: "#f8fafc",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "64px 76px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: "34px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "54px",
            height: "54px",
            borderRadius: "14px",
            background: "#22d3ee",
            color: "#020617",
            fontSize: "34px",
            fontWeight: 800,
            marginRight: "16px",
          }}
        >
          L
        </div>
        <div style={{ display: "flex", fontSize: "28px", fontWeight: 700 }}>LiquiFact</div>
        <div
          style={{
            display: "flex",
            marginLeft: "auto",
            border: "1px solid #334155",
            borderRadius: "999px",
            padding: "10px 18px",
            color: "#67e8f9",
            fontSize: "20px",
          }}
        >
          {status}
        </div>
      </div>

      <div style={{ display: "flex", color: "#94a3b8", fontSize: "22px", marginBottom: "12px" }}>
        {invoiceId}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "48px",
          lineHeight: 1.15,
          fontWeight: 700,
          marginBottom: "32px",
          maxWidth: "1000px",
        }}
      >
        {issuer}
      </div>

      {invoice ? (
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", gap: "64px", marginBottom: "28px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", color: "#94a3b8", fontSize: "18px" }}>FACE VALUE</div>
              <div style={{ display: "flex", fontSize: "34px", fontWeight: 700, marginTop: "6px" }}>
                {amount}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", color: "#94a3b8", fontSize: "18px" }}>YIELD</div>
              <div style={{ display: "flex", fontSize: "34px", fontWeight: 700, marginTop: "6px" }}>
                {rate === null ? "N/A" : `${rate.toFixed(2)}%`}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", color: "#94a3b8", fontSize: "18px" }}>FUNDED</div>
              <div style={{ display: "flex", fontSize: "34px", fontWeight: 700, marginTop: "6px" }}>
                {funded}%
              </div>
            </div>
          </div>
          <div
            style={{
              width: "100%",
              height: "14px",
              marginTop: "2px",
              borderRadius: "999px",
              background: "#1e293b",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${funded}%`,
                borderRadius: "999px",
                background: "#22d3ee",
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", color: "#94a3b8", fontSize: "26px" }}>
          This invoice is currently unavailable.
        </div>
      )}
    </div>
  );
}

export default async function ImageRoute({ params }) {
  const { id } = await Promise.resolve(params);
  const invoice = await fetchInvoiceById(id);

  return new ImageResponse(<InvoiceOpenGraphCard invoice={invoice} id={id} />, {
    ...size,
  });
}
