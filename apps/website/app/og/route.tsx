import { BRAND_COLORS, DEFAULT_OG_TITLE, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, SITE_NAME } from "@pos/seo";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

export const GET = async (request: NextRequest) => {
  const title = truncate(request.nextUrl.searchParams.get("title") || DEFAULT_OG_TITLE, 90);
  const eyebrow = truncate(request.nextUrl.searchParams.get("eyebrow") || SITE_NAME, 40);
  const compactTitle = title.length > 58;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: BRAND_COLORS.background,
        color: BRAND_COLORS.text,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "58px 64px 44px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: BRAND_COLORS.primary,
              color: BRAND_COLORS.surface,
              fontWeight: 800,
              fontSize: 29,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: BRAND_COLORS.primary }}>Servora</div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ width: 650, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#23724d",
              }}
            >
              <div style={{ width: 34, height: 4, background: "#e96f35" }} />
              {eyebrow}
            </div>
            <div
              style={{
                marginTop: 22,
                fontSize: compactTitle ? 52 : 60,
                fontWeight: 800,
                lineHeight: 1.04,
                letterSpacing: -1.8,
              }}
            >
              {title}
            </div>
            <div style={{ marginTop: 24, fontSize: 22, lineHeight: 1.4, color: BRAND_COLORS.muted }}>
              Restaurant operations connected from guest ordering to kitchen, billing and business control.
            </div>
          </div>

          <div style={{ width: 382, height: 330, display: "flex", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: 330,
                height: 245,
                borderRadius: 24,
                border: "3px solid #d8ded8",
                background: BRAND_COLORS.surface,
                padding: 20,
                display: "flex",
              }}
            >
              <div style={{ width: 62, borderRadius: 14, background: "#edf2ed" }} />
              <div style={{ marginLeft: 16, width: 212, display: "flex", flexDirection: "column" }}>
                <div style={{ height: 16, borderRadius: 8, background: "#d6ded8" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <div style={{ width: 62, height: 54, borderRadius: 12, background: "#e1eee5" }} />
                  <div style={{ width: 62, height: 54, borderRadius: 12, background: "#f8e4d7" }} />
                  <div style={{ width: 62, height: 54, borderRadius: 12, background: "#e7ead5" }} />
                </div>
                <div
                  style={{
                    marginTop: 18,
                    height: 93,
                    borderRadius: 14,
                    background: "#f3f5f2",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: 13,
                    gap: 7,
                  }}
                >
                  {[28, 48, 38, 66, 54, 78, 60].map((height, index) => (
                    <div
                      key={index}
                      style={{
                        width: 20,
                        height,
                        borderRadius: 5,
                        background: index % 2 === 0 ? "#9fc4ad" : BRAND_COLORS.primary,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: 132,
                height: 226,
                borderRadius: 28,
                border: `7px solid ${BRAND_COLORS.text}`,
                background: BRAND_COLORS.surface,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                transform: "rotate(-5deg)",
              }}
            >
              <div style={{ height: 45, borderRadius: 12, background: BRAND_COLORS.primary }} />
              <div style={{ marginTop: 12, height: 48, borderRadius: 12, background: "#edf2ed" }} />
              <div style={{ marginTop: 10, height: 48, borderRadius: 12, background: "#f8e4d7" }} />
              <div
                style={{
                  marginTop: 11,
                  marginLeft: "auto",
                  width: 18,
                  height: 18,
                  borderRadius: 99,
                  background: BRAND_COLORS.primary,
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #d9dfd9",
            paddingTop: 20,
            fontSize: 18,
            color: BRAND_COLORS.muted,
          }}
        >
          <div>Guest · Waiter · Kitchen · Business</div>
          <div style={{ color: BRAND_COLORS.primary, fontWeight: 700 }}>servora</div>
        </div>
      </div>
    </div>,
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
};
