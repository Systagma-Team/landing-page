import type { routing } from "@/i18n/routing";
import type messages from "@/messages/pt-BR.json";

// Typed locales and message keys for next-intl; en.json parity is checked in tests/check.mts
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
