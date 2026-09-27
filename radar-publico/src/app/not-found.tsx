import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="text-2xl font-semibold text-slate-900">Página não encontrada</h1>
      <p className="text-sm text-slate-600">O endereço não existe ou você não tem acesso a este registro.</p>
      <Link href="/" className="text-sm font-medium text-brand-700 underline">
        Voltar ao painel
      </Link>
    </main>
  );
}
