"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, Building2, FolderLock, Gauge, Lightbulb, ListChecks, Radar, Settings, Telescope, User } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./ui";

interface Item {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  children?: Item[];
}

function isActive(pathname: string, params: URLSearchParams, href: string): boolean {
  const [path, query] = href.split("?");
  if (path === "/") return pathname === "/";
  if (!pathname.startsWith(path)) return false;
  if (!query) return !(path === "/oportunidades" && (params.get("aba") || params.get("perfil")));
  const q = new URLSearchParams(query);
  return Array.from(q.entries()).every(([k, v]) => params.get(k) === v) && Array.from(["aba", "perfil"]).every((k) => q.has(k) || !params.get(k));
}

export function Nav({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const items: Item[] = [
    { href: "/", label: "Painel", icon: <Gauge className="size-4" aria-hidden /> },
    {
      href: "/oportunidades",
      label: "Oportunidades",
      icon: <ListChecks className="size-4" aria-hidden />,
      children: [
        { href: "/oportunidades", label: "Todas" },
        { href: "/oportunidades?perfil=mei", label: "MEI" },
        { href: "/oportunidades?perfil=systagma", label: "Systagma" },
        { href: "/oportunidades?aba=alta", label: "Alta compatibilidade" },
        { href: "/oportunidades?aba=revisar", label: "Revisar" },
        { href: "/oportunidades?aba=andamento", label: "Em andamento" },
        { href: "/oportunidades?aba=favoritas", label: "Favoritas" },
        { href: "/oportunidades?aba=descartadas", label: "Descartadas" },
      ],
    },
    { href: "/radar-futuro", label: "Radar futuro (PCA)", icon: <Telescope className="size-4" aria-hidden /> },
    { href: "/inovacao", label: "Inovação", icon: <Lightbulb className="size-4" aria-hidden /> },
    { href: "/alertas", label: "Alertas", icon: <Bell className="size-4" aria-hidden />, badge: unread },
    { href: "/cofre", label: "Cofre de documentos", icon: <FolderLock className="size-4" aria-hidden /> },
    {
      href: "/perfis",
      label: "Perfis",
      icon: <User className="size-4" aria-hidden />,
      children: [
        { href: "/perfis/mei", label: "MEI" },
        { href: "/perfis/systagma", label: "Systagma" },
      ],
    },
    {
      href: "/configuracoes",
      label: "Configurações",
      icon: <Settings className="size-4" aria-hidden />,
      children: [
        { href: "/configuracoes/fontes", label: "Fontes de dados" },
        { href: "/configuracoes/notificacoes", label: "Notificações" },
        { href: "/configuracoes/usuarios", label: "Usuários" },
        { href: "/configuracoes/auditoria", label: "Auditoria" },
        { href: "/configuracoes/conta", label: "Minha conta" },
      ],
    },
  ];

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-0.5 text-sm">
      {items.map((item) => {
        const active = item.children ? pathname.startsWith(item.href) && item.href !== "/" : isActive(pathname, params, item.href);
        return (
          <div key={item.href}>
            <Link
              href={item.children ? item.children[0].href : item.href}
              onClick={onNavigate}
              aria-current={!item.children && active ? "page" : undefined}
              className={cx(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 font-medium",
                active ? "bg-brand-800 text-white" : "text-brand-100 hover:bg-brand-900 hover:text-white",
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-slate-900" aria-label={`${item.badge} não lidos`}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
            {item.children && active && (
              <div className="mb-1 ml-6 mt-0.5 flex flex-col border-l border-brand-800 pl-2">
                {item.children.map((c) => {
                  const childActive = isActive(pathname, params, c.href);
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={onNavigate}
                      aria-current={childActive ? "page" : undefined}
                      className={cx("rounded px-2 py-1 text-[13px]", childActive ? "bg-brand-900 font-semibold text-white" : "text-brand-200 hover:text-white")}
                    >
                      {c.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-2.5 text-white">
      <Radar className="size-6 text-brand-300" aria-hidden />
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Radar Público</span>
        <span className="block text-[11px] text-brand-300">
          <Building2 className="mr-0.5 inline size-3" aria-hidden />
          Systagma
        </span>
      </span>
    </Link>
  );
}
