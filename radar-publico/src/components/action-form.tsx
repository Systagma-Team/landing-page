"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/app/actions/types";
import { cx } from "./ui";

/**
 * Wraps a Server Action with pending state and an accessible result message.
 * Every action re-checks authentication and authorization on the server.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={cx(className, pending && "opacity-70")}
      aria-busy={pending}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={cx("mt-2 text-xs", state.ok ? "text-emerald-700" : "text-red-700")}>
          {state.message}
        </p>
      )}
    </form>
  );
}
