"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-red-900">Não foi possível carregar esta página</h1>
      <p className="mt-1 text-sm text-red-800">Tente novamente. Se persistir, verifique a conexão com o banco de dados e os logs do servidor.</p>
      {error.digest && <p className="mt-2 text-xs text-red-700">Código: {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-4 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800">
        Tentar novamente
      </button>
    </div>
  );
}
