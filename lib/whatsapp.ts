import type { Locale } from "@/i18n/routing";

const PREFILL: Record<Locale, string> = {
  "pt-BR": "Olá, Systagma! Vim pelo site e gostaria de conversar sobre um projeto.",
  en: "Hi Systagma! I found you through your website and I'd like to talk about a project.",
};

export function whatsappHref(locale: Locale) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER; // digits only, country code first
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(PREFILL[locale])}`;
}
