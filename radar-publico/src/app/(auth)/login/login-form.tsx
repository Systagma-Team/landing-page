"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login } from "@/app/actions/auth";
import { buttonClass, Field, Input } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}
      <button type="submit" className={buttonClass.primary} disabled={pending}>
        <LogIn className="size-4" aria-hidden />
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
