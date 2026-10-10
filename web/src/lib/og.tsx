import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/** Branded spatial social card shared by every Open Graph / Twitter image route. */
export function renderOgImage({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(ellipse at top, #151a3d 0%, #070914 55%, #04050a 100%)",
          fontFamily: "sans-serif",
          color: "#f4f6ff",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -120,
            width: 700,
            height: 600,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(124,92,255,0.55), rgba(124,92,255,0) 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            right: -140,
            width: 760,
            height: 640,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(34,211,238,0.45), rgba(34,211,238,0) 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 56,
            right: 56,
            bottom: 56,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            borderRadius: 40,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
            boxShadow: "0 40px 90px -30px rgba(0,0,0,0.8)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "linear-gradient(135deg, #a594ff, #5b7cfa 55%, #22d3ee)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 700,
                color: "white",
              }}
            >
              L
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>Lustra</div>
            <div
              style={{
                marginLeft: 16,
                fontSize: 20,
                color: "#7ae7f7",
                textTransform: "uppercase",
                letterSpacing: 4,
              }}
            >
              {eyebrow}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: title.length > 60 ? 52 : 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, maxWidth: 960 }}>
              {title}
            </div>
            {subtitle && <div style={{ marginTop: 22, fontSize: 26, color: "rgba(226,232,255,0.72)", maxWidth: 900 }}>{subtitle}</div>}
          </div>
        </div>
      </div>
    ),
    ogSize,
  );
}
