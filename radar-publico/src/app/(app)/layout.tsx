import { Suspense, type ReactNode } from "react";
import { and, eq, isNull, sql } from "drizzle-orm";
import { LogOut, Menu } from "lucide-react";
import { getDb, schema } from "@/db";
import { logout } from "@/app/actions/auth";
import { Brand, Nav } from "@/components/nav";
import { requireUser } from "@/server/auth/dal";
import { ROLE_LABEL } from "@/server/auth/roles";

async function unreadCount(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.alertDeliveries)
    .where(and(eq(schema.alertDeliveries.userId, userId), eq(schema.alertDeliveries.channel, "IN_APP"), isNull(schema.alertDeliveries.readAt)));
  return row?.n ?? 0;
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const unread = await unreadCount(user.id);
  const sidebar = (
    <Suspense>
      <Nav unread={unread} />
    </Suspense>
  );
  return (
    <div className="min-h-dvh lg:flex">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-brand-950 px-3 py-5 lg:flex lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <Brand />
        {sidebar}
        <UserBox name={user.name} role={ROLE_LABEL[user.role]} org={user.organizationName} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-950 px-4 py-2.5 lg:hidden">
          <Brand />
          <details className="group relative">
            <summary className="rounded-md p-1.5 text-white hover:bg-brand-900" aria-label="Abrir menu">
              <Menu className="size-5" aria-hidden />
            </summary>
            <div className="absolute right-0 mt-2 w-72 rounded-lg bg-brand-950 p-3 shadow-xl ring-1 ring-brand-800">
              {sidebar}
              <UserBox name={user.name} role={ROLE_LABEL[user.role]} org={user.organizationName} />
            </div>
          </details>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-500 lg:px-8">
          Radar Público é um sistema de apoio à decisão. Análises automáticas não constituem parecer jurídico nem conclusão de habilitação.
          A decisão de participar e qualquer envio oficial são sempre humanos.
        </footer>
      </div>
    </div>
  );
}

function UserBox({ name, role, org }: { name: string; role: string; org: string }) {
  return (
    <div className="mt-auto rounded-md border border-brand-800 px-2.5 py-2 text-xs text-brand-200">
      <p className="truncate font-semibold text-white">{name}</p>
      <p className="truncate">
        {role} · {org}
      </p>
      <form action={logout} className="mt-2">
        <button type="submit" className="inline-flex items-center gap-1 text-brand-200 hover:text-white">
          <LogOut className="size-3.5" aria-hidden />
          Sair
        </button>
      </form>
    </div>
  );
}
