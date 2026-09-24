import en from "@/messages/en.json";
import { isSet, site } from "@/content/site";

export const dynamic = "force-static";

// Short Markdown summary for LLM crawlers (SPEC 10.4, optional convention), built from the site copy
export function GET() {
  const pillars = Object.values(en.services.pillars).map((p) => `- **${p.title}**: ${p.description}`);
  const body = [
    "# Systagma",
    "",
    `> ${en.meta.description}`,
    "",
    en.hero.lead,
    "",
    "## Services",
    ...pillars,
    "",
    "## Contact",
    `- Website: ${site.url} (Portuguese) · ${site.url}/en (English)`,
    ...(isSet(site.email) ? [`- Email: ${site.email}`] : []),
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
