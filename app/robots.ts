import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { indexable } from "@/lib/seo";

// Search and AI crawlers are allowed on purpose: being cited in AI answers is a discovery channel (SPEC 10.4).
// Without the production domain (NEXT_PUBLIC_SITE_URL) nothing is crawlable, so a misconfigured deploy can't be indexed.
export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", site.url).href,
  };
}
