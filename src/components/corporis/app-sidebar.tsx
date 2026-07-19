"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookmarkCheck,
  Bot,
  CalendarDays,
  ClipboardCheck,
  DoorOpen,
  Dumbbell,
  FileText,
  Filter,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Newspaper,
  Package,
  Settings,
  ShoppingBag,
  Stethoscope,
  UserRoundCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  realtime?: boolean;
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Gestão",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/clientes",  label: "Clientes",  icon: Users },
      { href: "/clientes/onboarding", label: "Onboarding", icon: ClipboardCheck },
      { href: "/agenda",    label: "Agenda",    icon: CalendarDays },
      { href: "/vendas",    label: "Vendas",    icon: ShoppingBag },
    ],
  },
  {
    title: "Relacionamento",
    items: [
      { href: "/inbox",        label: "Inbox",     icon: Inbox, realtime: true },
      { href: "/funil",        label: "Funil",     icon: Filter },
      { href: "/config/agente", label: "Agente IA", icon: Bot },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { href: "/vendas/planos",           label: "Planos",              icon: Package },
      { href: "/cadastros/servicos",      label: "Serviços",            icon: Dumbbell },
      { href: "/cadastros/profissionais", label: "Profissionais",       icon: Stethoscope },
      { href: "/cadastros/salas",         label: "Salas",               icon: DoorOpen },
      { href: "/cadastros/contratos",     label: "Modelos de contrato", icon: FileText },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { href: "/conteudo", label: "Painel", icon: Newspaper },
      { href: "/conteudo/ideias", label: "Ideias", icon: Lightbulb },
      { href: "/conteudo/referencias", label: "Referências", icon: BookmarkCheck },
      { href: "/conteudo/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<{ nome: string; initials: string } | null>(null);

  // Load unread count + subscribe to Realtime
  useEffect(() => {
    const supabase = createClient();

    async function loadUnread() {
      const { count } = await supabase
        .schema("crm")
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("nao_lida", true);
      setUnreadCount(count ?? 0);
    }

    loadUnread();

    const channel = supabase
      .channel("sidebar_conversations")
      .on("postgres_changes", {
        event: "*", schema: "crm", table: "conversations",
      }, () => { loadUnread(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load logged-in user profile
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.schema("crm").from("profiles").select("nome").eq("id", user.id).single()
        .then(({ data }) => {
          if (data) {
            const initials = data.nome.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
            setProfile({ nome: data.nome, initials });
          }
        });
    });
  }, []);

  // Acende só o href mais específico que casa com o pathname
  // (evita /vendas e /vendas/planos acenderem juntos).
  const allHrefs = [...navGroups.flatMap((g) => g.items.map((i) => i.href)), "/config/sistema"];
  const activeHref = allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside
      aria-label="Navegação"
      className="sticky top-0 grid h-dvh self-start grid-rows-[1fr_auto] border-r border-border bg-card px-4 pb-4 pt-8"
    >
      <nav aria-label="Navegação principal" className="overflow-y-auto crm-scrollbar">
        {navGroups.map((group, gi) => (
          <div key={group.title} className={cn(gi > 0 && "mt-6")}>
            <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[2.2px] text-accent">
              {group.title}
            </p>

            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeHref === item.href;
                const badge  = item.realtime && unreadCount ? String(unreadCount) : null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-[11px] text-sm font-normal leading-none text-text-secondary !no-underline transition-colors hover:bg-accent-soft hover:text-text-primary",
                      active && "bg-accent-soft font-medium text-text-primary hover:bg-accent-soft",
                    )}
                  >
                    {active ? (
                      <span className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r-[var(--radius-pill)] bg-primary" />
                    ) : null}

                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>

                    {badge ? (
                      <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-1.5 text-[10px] font-medium text-[var(--color-fundo-claro)]">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6">
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[2.2px] text-accent">
            Sistema
          </p>
          <Link
            href="/config/sistema"
            aria-current={activeHref === "/config/sistema" ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-[11px] text-sm font-normal leading-none text-text-secondary !no-underline transition-colors hover:bg-accent-soft hover:text-text-primary",
              activeHref === "/config/sistema" && "bg-accent-soft font-medium text-text-primary",
            )}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            <span className="min-w-0 flex-1 truncate">Configurações</span>
          </Link>
        </div>
      </nav>

      <Link
        href="/perfil"
        className="flex items-center gap-3 border-t border-border px-2 py-3 text-text-primary !no-underline transition-colors hover:bg-accent-soft"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft font-display text-sm leading-none text-text-primary">
          {profile?.initials ?? "CF"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight text-text-primary">
            {profile?.nome ?? "Corporis Staff"}
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-text-secondary">
            Corporis Fisioterapia
          </p>
        </div>
        <UserRoundCog className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.5} />
      </Link>
    </aside>
  );
}
