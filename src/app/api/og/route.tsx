import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "365happy365";
  const category = searchParams.get("category") || "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fefdfb",
          padding: "60px",
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.15)",
            transform: "translate(100px, -100px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(249, 115, 22, 0.12)",
            transform: "translate(-80px, 80px)",
          }}
        />

        {/* Site name */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#f59e0b",
            marginBottom: 20,
            letterSpacing: "0.05em",
          }}
        >
          365happy365
        </div>

        {/* Category */}
        {category && (
          <div
            style={{
              fontSize: 18,
              color: "#f97316",
              backgroundColor: "#fff7ed",
              padding: "4px 16px",
              borderRadius: 20,
              marginBottom: 20,
            }}
          >
            {category}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 30 ? 42 : 56,
            fontWeight: 700,
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 20,
            color: "#737373",
            marginTop: 24,
          }}
        >
          세상의 모든 궁금한 것들
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
