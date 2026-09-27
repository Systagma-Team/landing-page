import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Radar Público", template: "%s · Radar Público" },
  description: "Inteligência de oportunidades em compras públicas — Systagma",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
