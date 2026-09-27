import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/dal";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Systagma</p>
          <h1 className="mt-1 text-2xl font-semibold">Radar Público</h1>
          <p className="mt-1 text-sm text-brand-200">Inteligência de oportunidades em compras públicas</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <LoginForm next={typeof next === "string" ? next : "/"} />
        </div>
        <p className="mt-4 text-center text-xs text-brand-300">Acesso interno. Não há cadastro público — solicite acesso a um administrador.</p>
      </div>
    </main>
  );
}
