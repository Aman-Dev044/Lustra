import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ffb36b 0%, #ff6a2b 55%, #d9380c 100%)",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 64 64" fill="none">
          <path d="M20 12v38h26" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M31 12h15" stroke="#fff" strokeOpacity="0.55" strokeWidth="7" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
