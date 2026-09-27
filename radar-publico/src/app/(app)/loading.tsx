export default function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
