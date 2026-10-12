import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = "KI-Sichtbarkeit messen und verbessern";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #eff4ff 0%, #ffffff 60%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 32, color: "#1d4ed8", fontWeight: 700 }}>{site.name}</div>
        <div style={{ fontSize: 68, fontWeight: 800, marginTop: 24, lineHeight: 1.1 }}>{"Wird dein Unternehmen von ChatGPT Wird dein Unternehmen von ChatGPT &amp; Co. gefunden? Co. gefunden?"}</div>
        <div style={{ fontSize: 30, marginTop: 28, color: "#475569" }}>KI-Sichtbarkeit messen · Website prüfen · Maßnahmen ableiten</div>
      </div>
    ),
    size,
  );
}
