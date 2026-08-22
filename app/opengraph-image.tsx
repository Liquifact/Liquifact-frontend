import { ImageResponse } from "next/og";
import { copy } from "./copy/en";

export const runtime = "edge";

export const alt = "LiquiFact Social Preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#020617", // slate-950
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
        <div
          style={{
            background: "#22d3ee", // cyan-400
            color: "#020617",
            width: "80px",
            height: "80px",
            borderRadius: "20%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "48px",
            fontWeight: 800,
            marginRight: "24px",
          }}
        >
          L
        </div>
        <h1 style={{ fontSize: "64px", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
          LiquiFact
        </h1>
      </div>
      <h2
        style={{
          fontSize: "56px",
          fontWeight: 700,
          marginBottom: "24px",
          lineHeight: 1.2,
          color: "#22d3ee",
        }}
      >
        {copy.home.heroTitle}
      </h2>
      <p style={{ fontSize: "32px", color: "#94a3b8", maxWidth: "900px", lineHeight: 1.4 }}>
        {copy.home.heroSub}
      </p>
    </div>,
    {
      ...size,
    }
  );
}
