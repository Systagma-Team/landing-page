import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { site } from "@/content/site";

// SPEC 10.2: Abyss background, 6% isometric grid, localized H1, symbol on the right, domain bottom-left
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Systagma";
export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export default async function Image({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  // Literal paths keep build tracing scoped to these three files
  const [urbanist, plex, symbol] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Urbanist-SemiBold.woff")),
    readFile(join(process.cwd(), "assets/fonts/IBMPlexSans-Regular.woff")),
    readFile(join(process.cwd(), "public/brand/systagma-symbol-color.png")),
  ]);
  const grid = "rgba(241,244,248,0.06)";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#031227", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(30deg, ${grid} 0 1px, transparent 1px 32px), repeating-linear-gradient(-30deg, ${grid} 0 1px, transparent 1px 32px)`,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 80px", width: 720 }}>
          <div style={{ fontFamily: "Urbanist", fontSize: 88, lineHeight: 1.02, letterSpacing: "-0.03em", color: "#F1F4F8" }}>
            {t("h1")}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
        <img
          src={`data:image/png;base64,${symbol.toString("base64")}`}
          height={420}
          width={Math.round((420 * 550) / 890)}
          style={{ position: "absolute", right: 150, top: 105 }}
          alt=""
        />
        <div style={{ position: "absolute", left: 80, bottom: 56, fontFamily: "Plex", fontSize: 28, color: "#B6BFC9" }}>
          {new URL(site.url).host}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Urbanist", data: urbanist, weight: 600, style: "normal" },
        { name: "Plex", data: plex, weight: 400, style: "normal" },
      ],
    },
  );
}
