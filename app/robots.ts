import type { MetadataRoute } from "next";
import { site } from "@/content/site";

// Search and AI crawlers are allowed on purpose: being cited in AI answers is a discovery channel (SPEC 10.4)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", site.url).href,
  };
}
