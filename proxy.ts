import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale from the URL only ("/" is pt-BR, "/en" is English), prefix redirects and localized pathnames
export default createMiddleware(routing);

export const config = {
  // Skip Next internals, files with an extension (icons, robots.txt…) and OG images, whose metadata
  // URL keeps the /pt-BR prefix and would otherwise be redirected
  matcher: ["/((?!_next|.*opengraph-image|.*\\..*).*)"],
};
