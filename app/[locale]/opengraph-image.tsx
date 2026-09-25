import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { site } from "@/content/site";

// SPEC 9.2: the `symbol` field still as background, the two-line headline (Plex Sans Light caps + Source Serif
// italic) on the left, the domain in Plex Mono. assets/og/symbol-field.png is a still of that formation.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Systagma";
export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export default async function Image({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  // Literal paths keep build tracing scoped to these files
  const [sans, serif, mono, still] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/IBMPlexSans-Light.woff")),
    readFile(join(process.cwd(), "assets/fonts/SourceSerif4-LightItalic.woff")),
    readFile(join(process.cwd(), "assets/fonts/IBMPlexMono-Regular.woff")),
    readFile(join(process.cwd(), "assets/og/symbol-field.png")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#020A17" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
        <img src={`data:image/png;base64,${still.toString("base64")}`} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 80, width: 760, color: "#F1F4F8" }}>
          <div style={{ fontFamily: "Plex", fontSize: 96, lineHeight: 0.95, letterSpacing: "-0.04em", textTransform: "uppercase" }}>{t("h1a")}</div>
          <div style={{ fontFamily: "Serif", fontStyle: "italic", fontSize: 96, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{t("h1b")}</div>
        </div>
        <div style={{ position: "absolute", left: 80, bottom: 52, fontFamily: "Mono", fontSize: 22, letterSpacing: "0.08em", color: "#8F99A6" }}>
          {new URL(site.url).host.toUpperCase()}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plex", data: sans, weight: 300, style: "normal" },
        { name: "Serif", data: serif, weight: 300, style: "italic" },
        { name: "Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
