import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock3,
  Globe,
  MessageCircle,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getGestaoStats } from "@/lib/queries/dashboard-gestao";
import { StatCard } from "@/components/corporis/stat-card";
import { formatBRL } from "@/lib/vendas-labels";
import { UserCheck, TrendingUp, Wallet, CircleDollarSign, AlertTriangle } from "lucide-react";
import type { LeadOrigin, AppointmentType } from "@/types/database";

function InstagramGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const ORIGIN_ICONS: Record<LeadOrigin, React.FC<React.SVGProps<SVGSVGElement>>> = {
  whatsapp: MessageCircle,
  instagram: InstagramGlyph,
  indicacao: UsersRound,
  google: Search,
  outro: Globe,
};

const TIPO_LABEL: Record<AppointmentType, string> = {
  avaliacao_pilates: "Pilates terapêutico",
  avaliacao_gestante: "Pilates gestante",
  avaliacao_fisio_pelvica: "Fisioterapia pélvica",
};

const TIPO_KIND: Record<AppointmentType, string> = {
  avaliacao_pilates: "pilates",
  avaliacao_gestante: "gestante",
  avaliacao_fisio_pelvica: "pelvica",
};

function CardAction({ children, href = "#" }: { children: React.ReactNode; href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 border-b border-transparent pb-px text-xs font-medium text-text-secondary no-underline transition-colors hover:border-primary hover:text-primary"
    >
      {children}
      <ArrowRight className="h-3 w-3" strokeWidth={1.6} />
    </Link>
  );
}

function pctChange(cur: number, prev: number): { label: string; trend: "up" | "down" } {
  if (prev === 0 && cur === 0) return { label: "—", trend: "up" };
  if (prev === 0) return { label: `+${cur}`, trend: "up" };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return {
    label: `${pct >= 0 ? "+" : ""}${pct}%`,
    trend: pct >= 0 ? "up" : "down",
  };
}

export default async function DashboardPage() {
  const [stats, gestao] = await Promise.all([getDashboardStats(), getGestaoStats()]);
  const { kpis, funnelByStage, originBreakdown, todayAppointments, attentionLeads, todayLabel } = stats;

  const convRate = kpis.totalLeads > 0
    ? Math.round((kpis.convertidas / kpis.totalLeads) * 100)
    : 0;

  const leadsChange = pctChange(kpis.leadsNovos, kpis.leadsNovosPrev);

  const kpisData = [
    {
      label: "Leads novos",
      value: String(kpis.leadsNovos),
      change: leadsChange.label,
      trend: leadsChange.trend,
      helper: "vs. 7 dias anteriores",
    },
    {
      label: "Conversas em aberto",
      value: String(kpis.conversasAbertas),
      change: kpis.conversasAbertas > 0 ? `${kpis.conversasAbertas} ativas` : "Nenhuma",
      trend: "up" as const,
      helper: "conversas abertas agora",
    },
    {
      label: "Avaliações agendadas",
      value: String(kpis.avaliacoesAgendadas),
      change: kpis.avaliacoesAgendadas > 0 ? "agendadas" : "nenhuma",
      trend: "up" as const,
      helper: "próximas avaliações",
    },
    {
      label: "Taxa de conversão",
      value: String(convRate),
      unit: "%",
      change: `${kpis.convertidas} convertidas`,
      trend: "up" as const,
      helper: "lead → convertida",
    },
  ] as const;

  const topFunnel = funnelByStage[0]?.count ?? 1;
  const topOrigin = originBreakdown.reduce((max, o) => Math.max(max, o.count), 1);
  const totalOrigins = originBreakdown.reduce((s, o) => s + o.count, 0);

  return (
    <main className="h-dvh overflow-y-auto bg-background p-8">
      <div className="mx-auto grid max-w-[1440px] gap-8">
        {/* Visão de gestão */}
        <section aria-label="Visão de gestão">
          <div className="mb-4">
            <h2 className="font-display text-[22px] leading-tight text-text-primary">Visão de saúde da clínica</h2>
            <p className="mt-1 text-[13px] text-text-secondary">Clientes ativos, receita recorrente e cobranças num relance.</p>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <StatCard label="Clientes ativos" value={gestao.clientesAtivos} icon={<UserCheck className="h-5 w-5" strokeWidth={1.5} />} />
            <StatCard label="MRR" value={formatBRL(gestao.mrr)} icon={<TrendingUp className="h-5 w-5" strokeWidth={1.5} />} />
            <StatCard label="Recebido no mês" value={formatBRL(gestao.recebidoMes)} icon={<Wallet className="h-5 w-5" strokeWidth={1.5} />} />
            <StatCard label="Em aberto" value={formatBRL(gestao.emAberto)} icon={<CircleDollarSign className="h-5 w-5" strokeWidth={1.5} />} />
            <StatCard label="Inadimplentes" value={gestao.inadimplentes} icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.5} />} />
          </div>

          {gestao.pendencias.length > 0 ? (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
              <div className="mb-4 flex items-end justify-between">
                <div className="font-display text-lg text-text-primary">Pendências</div>
                <span className="text-xs text-text-secondary">{gestao.pendencias.length} itens</span>
              </div>
              <div className="grid gap-1">
                {gestao.pendencias.map((p) => {
                  const inner = (
                    <>
                      <span className={p.tipo === "financeiro"
                        ? "shrink-0 rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--color-ui-error)_10%,transparent)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1.2px] text-[var(--color-ui-error)]"
                        : "shrink-0 rounded-[var(--radius-pill)] bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1.2px] text-text-secondary"}>
                        {p.tipo === "financeiro" ? "Financeiro" : "Contrato"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-primary">{p.titulo}</span>
                        <span className="block text-xs text-text-secondary">{p.detalhe}</span>
                      </span>
                    </>
                  );
                  return p.pessoaId ? (
                    <Link key={p.id} href={`/clientes/${p.pessoaId}`} className="-mx-2 flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 no-underline transition-colors hover:bg-accent-soft">
                      {inner}
                    </Link>
                  ) : (
                    <div key={p.id} className="flex items-center gap-3 px-0 py-2.5">{inner}</div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-4 gap-6" aria-label="Indicadores de captação">
          {kpisData.map((kpi) => {
            const TrendIcon = kpi.trend === "up" ? ChevronUp : ChevronDown;
            return (
              <article
                key={kpi.label}
                className="flex min-h-[156px] flex-col gap-3.5 rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-[var(--shadow-sm)]"
              >
                <p className="text-[11px] font-medium uppercase tracking-[2px] text-text-secondary">
                  {kpi.label}
                </p>
                <p className="font-display text-[52px] leading-none tracking-[-0.01em] text-text-primary [font-feature-settings:'tnum']">
                  {kpi.value}
                  {"unit" in kpi ? (
                    <span className="ml-0.5 text-[28px] text-text-secondary">{kpi.unit}</span>
                  ) : null}
                </p>
                <div className="mt-auto flex items-center gap-1.5">
                  <span
                    className={
                      kpi.trend === "up"
                        ? "inline-flex items-center gap-1 text-[13px] font-medium text-success"
                        : "inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-ui-error)]"
                    }
                  >
                    <TrendIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {kpi.change}
                  </span>
                  {" "}
                  <span className="text-xs text-text-secondary">{kpi.helper}</span>
                </div>
              </article>
            );
          })}
        </section>

        {/* Funnel */}
        <section
          className="rounded-[var(--radius-lg)] border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
          aria-label="Funil de captação"
        >
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="font-display text-[22px] leading-tight text-text-primary">
                Funil de captação
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">
                Últimos 7 dias · {kpis.leadsNovos} leads iniciados, {kpis.convertidas} convertidas
              </p>
            </div>
            <div className="flex items-baseline gap-6">
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-lg leading-none text-text-primary">
                  {convRate}%
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[1.6px] text-text-secondary">
                  Conv. global
                </span>
              </div>
              <CardAction href="/funil">Ver detalhes</CardAction>
            </div>
          </div>

          <div className="grid gap-3.5">
            {funnelByStage.map((stage) => {
              const width = Math.max(6, topFunnel > 0 ? (stage.count / topFunnel) * 100 : 0);
              const pct = topFunnel > 0 ? Math.round((stage.count / topFunnel) * 100) : 0;
              return (
                <div
                  key={stage.estagio}
                  className="grid grid-cols-[180px_1fr_64px] items-center gap-4"
                >
                  <div className="flex items-center gap-2.5 text-[13px] font-medium text-text-primary">
                    <span
                      className="h-2 w-2 shrink-0 rounded-[var(--radius-pill)]"
                      style={{ background: stage.color }}
                    />
                    {stage.label}
                  </div>
                  <div className="h-[26px] overflow-hidden rounded-[var(--radius-md)] bg-muted">
                    <div
                      className="h-full rounded-[var(--radius-md)]"
                      style={{ width: `${width}%`, background: stage.color }}
                    />
                  </div>
                  <div>
                    <div className="text-right font-display text-[22px] leading-none text-text-primary">
                      {stage.count}
                    </div>
                    <div className="mt-1 text-right text-[11px] text-text-secondary">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-[1fr_1fr_1.25fr] gap-6">
          {/* Origins */}
          <article
            className="rounded-[var(--radius-lg)] border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
            aria-label="Origem dos leads"
          >
            <div className="mb-6">
              <div className="font-display text-[22px] leading-tight text-text-primary">
                Origem dos leads
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">De onde a aluna chegou</p>
            </div>

            {originBreakdown.length > 0 ? (
              <div className="grid gap-[18px]">
                {originBreakdown.map((origin) => {
                  const width = (origin.count / topOrigin) * 100;
                  const Icon = ORIGIN_ICONS[origin.origem];
                  return (
                    <div
                      key={origin.origem}
                      className="grid grid-cols-[96px_1fr_56px] items-center gap-3.5"
                    >
                      <div className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
                        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                        {origin.label}
                      </div>
                      <div className="h-2 overflow-hidden rounded-[var(--radius-pill)] bg-muted">
                        <div
                          className="h-full rounded-[var(--radius-pill)]"
                          style={{ width: `${width}%`, background: origin.color }}
                        />
                      </div>
                      <div className="text-right text-[13px] font-medium text-text-primary">
                        {origin.count}
                        <span className="ml-1 text-[11px] font-normal text-text-secondary">
                          {origin.pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-text-secondary">Nenhum lead ainda.</p>
            )}

            <div className="mt-[18px] flex items-baseline justify-between border-t border-dashed border-border pt-[18px]">
              <span className="text-[11px] font-medium uppercase tracking-[1.8px] text-text-secondary">
                Total no período
              </span>
              <span className="font-display text-[22px] text-text-primary">{totalOrigins}</span>
            </div>
          </article>

          {/* Today agenda */}
          <article
            className="rounded-[var(--radius-lg)] border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
            aria-label="Agenda de hoje"
          >
            <div className="mb-6 flex items-end justify-between">
              <div>
                <div className="font-display text-[22px] leading-tight text-text-primary">
                  Agenda de hoje
                </div>
                <p className="mt-1 text-[13px] capitalize text-text-secondary">
                  {todayLabel} · {todayAppointments.length} avaliações
                </p>
              </div>
              <CardAction href="/agenda">Abrir agenda</CardAction>
            </div>

            {todayAppointments.length > 0 ? (
              <div className="flex flex-col">
                {todayAppointments.map((appt) => {
                  const kind = TIPO_KIND[appt.tipo] ?? "pilates";
                  const statusLabel =
                    appt.status === "confirmado"
                      ? "Confirmada"
                      : appt.status === "compareceu"
                        ? "Compareceu"
                        : appt.status === "faltou"
                          ? "Faltou"
                          : appt.status === "cancelado"
                            ? "Cancelado"
                            : "Aguardando";
                  const confirmed = appt.status === "confirmado" || appt.status === "compareceu";
                  return (
                    <div
                      key={appt.id}
                      className="grid grid-cols-[56px_1fr] items-center gap-3.5 border-t border-border py-3.5 first:border-t-0 first:pt-1"
                    >
                      <span className="text-sm font-medium leading-tight text-text-primary">
                        {appt.inicio}
                      </span>
                      <div className="min-w-0">
                        <div className="whitespace-nowrap text-sm font-medium leading-tight text-text-primary">
                          {appt.lead_nome}
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-text-secondary">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-[var(--radius-pill)]"
                              style={{
                                background:
                                  kind === "gestante"
                                    ? "var(--color-tangerina)"
                                    : kind === "pelvica"
                                      ? "var(--color-verde)"
                                      : "var(--color-bege)",
                              }}
                            />
                            <span>{TIPO_LABEL[appt.tipo]}</span>
                          </span>
                          <span
                            className={
                              confirmed
                                ? "shrink-0 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--color-verde)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-verde)_12%,transparent)] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[1.2px] text-[color-mix(in_srgb,var(--color-verde)_72%,var(--color-texto-escuro))]"
                                : "shrink-0 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--color-bege)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-bege-claro)_35%,transparent)] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[1.2px] text-[color-mix(in_srgb,var(--color-bege)_70%,var(--color-texto-escuro))]"
                            }
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-text-secondary">Nenhuma avaliação hoje.</p>
            )}
          </article>

          {/* Attention */}
          <article
            className="rounded-[var(--radius-lg)] border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
            aria-label="Precisam de atenção"
          >
            <div className="mb-6 flex items-end justify-between">
              <div>
                <div className="font-display text-[22px] leading-tight text-text-primary">
                  Precisam de atenção
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Leads parados ou conversas sem resposta
                </p>
              </div>
              <CardAction href="/funil">Ver todas</CardAction>
            </div>

            {attentionLeads.length > 0 ? (
              <div className="flex flex-col">
                {attentionLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="-mx-2 grid grid-cols-[36px_1fr_auto] items-center gap-3.5 rounded-[var(--radius-md)] border-t border-border px-2 py-3.5 text-inherit no-underline transition-colors first:border-t-0 hover:bg-accent-soft"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-muted text-xs text-text-secondary">
                      {lead.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium leading-tight text-text-primary">
                        {lead.nome}
                        <span
                          className={
                            lead.tone === "urgent"
                              ? "rounded-[var(--radius-xs)] bg-[color-mix(in_srgb,var(--color-ui-error)_10%,transparent)] px-2 py-[3px] text-[10px] font-medium uppercase tracking-[1.2px] text-[var(--color-ui-error)]"
                              : "rounded-[var(--radius-xs)] bg-muted px-2 py-[3px] text-[10px] font-medium uppercase tracking-[1.2px] text-text-secondary"
                          }
                        >
                          {lead.tag}
                        </span>
                      </span>
                      <span className="mt-[3px] flex items-center gap-1.5 text-xs leading-snug text-text-secondary">
                        <Clock3 className="h-3 w-3 text-accent" strokeWidth={1.6} />
                        {lead.reason}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-text-secondary transition-transform" strokeWidth={1.5} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-text-secondary">
                Tudo em dia. Nenhum lead precisa de atenção.
              </p>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
