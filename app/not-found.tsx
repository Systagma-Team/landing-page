import Link from "next/link";
import "./globals.css";

// Only reached by paths the proxy skips (e.g. unknown files); locale pages use app/[locale]/not-found.tsx
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR">
      <body data-theme="light" className="grid min-h-svh place-items-center p-6 text-center">
        <main>
          <h1 className="text-heading-lg">Esta parte do sistema não existe.</h1>
          <p className="mt-4">
            <Link href="/" className="link">Voltar ao início</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
