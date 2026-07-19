"use client";

import { useMemo, useState } from "react";
import { BarChart3, Check, Info, Sparkles, UserPlus, X } from "lucide-react";
import {
  atribuirLead,
  aprenderComOsMelhores,
  buscarPessoas,
  removerAtribuicao,
  salvarMetricaManual,
  type PessoaBusca,
} from "./actions";

type Post = { id: string; titulo: string; pilar_id: string | null; status: string };
type CtaLead = {
  id: string;
  post_id: string;
  cliques: number;
  pessoa_id: string | null;
  virou_agendamento: boolean;
  pessoa: { nome: string; telefone: string | null } | null;
};
type Metrica = {
  post_id: string;
  data: string;
  alcance: number | null;
  impressoes: number | null;
  saves: number | null;
  curtidas: number | null;
  comentarios: number | null;
  visitas_perfil: number | null;
  cliques_link: number | null;
};
type Pilar = { id: string; nome: string; cor_token: string };

const METRICA_FIELDS: { key: keyof Metrica; label: string }[] = [
  { key: "alcance", label: "Alcance" },
  { key: "impressoes", label: "Impressões" },
  { key: "curtidas", label: "Curtidas" },
  { key: "saves", label: "Saves" },
  { key: "comentarios", label: "Comentários" },
  { key: "visitas_perfil", label: "Visitas ao perfil" },
  { key: "cliques_link", label: "Cliques no link" },
];

function sum(values: (number | null)[]): number {
  return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
}

export function MetricasClient({
  posts,
  ctaLeads: initialCtaLeads,
  metricas: initialMetricas,
  pilares,
  hoje,
}: {
  posts: Post[];
  ctaLeads: CtaLead[];
  metricas: Metrica[];
  pilares: Pilar[];
  hoje: string;
}) {
  const [ctaLeads, setCtaLeads] = useState(initialCtaLeads);
  const [metricas, setMetricas] = useState(initialMetricas);
  const [openRow, setOpenRow] = useState<{ postId: string; mode: "atribuir" | "metrica" } | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aprenderPending, setAprenderPending] = useState(false);
  const [aprenderMsg, setAprenderMsg] = useState<string | null>(null);

  const pilarById = useMemo(() => new Map(pilares.map((p) => [p.id, p])), [pilares]);

  const ranking = useMemo(() => {
    return posts
      .map((post) => {
        const links = ctaLeads.filter((c) => c.post_id === post.id);
        const leads = links.filter((c) => c.pessoa_id);
        const postMetricas = metricas.filter((m) => m.post_id === post.id);
        return {
          post,
          leads,
          leadsCount: leads.length,
          agendamentosCount: leads.filter((l) => l.virou_agendamento).length,
          cliques: sum(links.map((l) => l.cliques)),
          saves: sum(postMetricas.map((m) => m.saves)),
        };
      })
      .sort((a, b) => b.leadsCount - a.leadsCount || b.cliques - a.cliques);
  }, [posts, ctaLeads, metricas]);

  const totais = useMemo(
    () => ({
      alcance: sum(metricas.map((m) => m.alcance)),
      saves: sum(metricas.map((m) => m.saves)),
      visitasPerfil: sum(metricas.map((m) => m.visitas_perfil)),
    }),
    [metricas],
  );

  const totalLeads = ranking.reduce((acc, r) => acc + r.leadsCount, 0);
  const topPosts = ranking.filter((r) => r.leadsCount > 0).slice(0, 3);

  function toggleSelecionado(postId: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function handleAprender() {
    if (selecionados.size === 0) return;
    setAprenderPending(true);
    setAprenderMsg(null);
    aprenderComOsMelhores([...selecionados]).then((result) => {
      setAprenderPending(false);
      if (!result.success) {
        setAprenderMsg(result.error);
        return;
      }
      setAprenderMsg(`${result.criadas} ideia(s) criada(s) no Banco de ideias.`);
      setSelecionados(new Set());
    });
  }

  function handleAtribuido(postId: string, novo: CtaLead) {
    setCtaLeads((prev) => [...prev, novo]);
    setOpenRow(null);
  }

  function handleRemoverAtribuicao(id: string) {
    setCtaLeads((prev) => prev.filter((c) => c.id !== id));
    removerAtribuicao(id);
  }

  function handleMetricaSalva(m: Metrica) {
    setMetricas((prev) => {
      const idx = prev.findIndex((x) => x.post_id === m.post_id && x.data === m.data);
      if (idx === -1) return [...prev, m];
      const next = [...prev];
      next[idx] = m;
      return next;
    });
    setOpenRow(null);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 py-6">
        <h1 className="font-display text-[26px] text-text-primary">Métricas</h1>
        <p className="type-body-sm text-text-secondary">O que gera aluna, não o que gera curtida.</p>
      </header>

      <div className="crm-scrollbar min-w-0 flex-1 overflow-auto p-6">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
          <div
            className="w-fit rounded-[var(--radius-lg)] p-5"
            style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)" }}
          >
            <span className="text-[12px] font-medium uppercase tracking-[1.5px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              Leads atribuídos
            </span>
            <div className="mt-1 font-display text-[34px] leading-none text-text-primary">
              {totalLeads} <span className="text-[15px] font-normal text-text-secondary">lead(s)</span>
            </div>
          </div>

          <section className="rounded-[var(--radius-lg)] p-5" style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)" }}>
            <h2 className="font-display text-[19px] text-text-primary">Posts que mais trouxeram leads</h2>
            <p className="mt-0.5 text-[12.5px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              A régua é lead e agendamento — cliques e saves são só contexto.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {ranking.length === 0 && (
                <p className="py-6 text-center text-sm text-text-secondary">Nenhum post publicado ainda.</p>
              )}
              {ranking.map((r) => {
                const pilar = r.post.pilar_id ? pilarById.get(r.post.pilar_id) : undefined;
                const isOpenAtribuir = openRow?.postId === r.post.id && openRow.mode === "atribuir";
                const isOpenMetrica = openRow?.postId === r.post.id && openRow.mode === "metrica";
                return (
                  <div key={r.post.id} className="rounded-[var(--radius-md)]" style={{ background: "var(--surface-sunken)" }}>
                    <div className="grid items-center gap-3 px-3.5 py-3" style={{ gridTemplateColumns: "1fr 70px 110px 90px 80px auto" }}>
                      <div className="flex min-w-0 items-center gap-2">
                        {pilar && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--${pilar.cor_token})` }} />}
                        <span className="truncate text-[13.5px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                          {r.post.titulo}
                        </span>
                      </div>
                      <span className="text-center text-[14px] font-medium text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                        {r.leadsCount}
                      </span>
                      <span className="text-center text-[13px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                        {r.agendamentosCount} agend.
                      </span>
                      <span className="text-center text-[13px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                        {r.cliques} cliq.
                      </span>
                      <span className="text-center text-[13px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                        {r.saves} saves
                      </span>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOpenRow(isOpenAtribuir ? null : { postId: r.post.id, mode: "atribuir" })}
                          className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-medium text-text-primary"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          <UserPlus className="h-3 w-3" strokeWidth={1.8} />
                          Lead
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenRow(isOpenMetrica ? null : { postId: r.post.id, mode: "metrica" })}
                          className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-medium text-text-primary"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          <BarChart3 className="h-3 w-3" strokeWidth={1.8} />
                          Métricas
                        </button>
                      </div>
                    </div>

                    {r.leads.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
                        {r.leads.map((l) => (
                          <span
                            key={l.id}
                            className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-card py-1 pl-2.5 pr-1 text-[11.5px] text-text-primary"
                            style={{ fontFamily: "var(--font-body)", border: "0.6px solid var(--color-cinza)" }}
                          >
                            {l.pessoa?.nome ?? "—"}
                            {l.virou_agendamento && <Check className="h-2.5 w-2.5" style={{ color: "var(--color-verde)" }} strokeWidth={2.4} />}
                            <button
                              type="button"
                              onClick={() => handleRemoverAtribuicao(l.id)}
                              aria-label="Remover atribuição"
                              className="flex h-3.5 w-3.5 items-center justify-center text-text-secondary"
                            >
                              <X className="h-2.5 w-2.5" strokeWidth={2} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {isOpenAtribuir && <AtribuirPanel postId={r.post.id} onDone={handleAtribuido} onCancel={() => setOpenRow(null)} />}
                    {isOpenMetrica && (
                      <MetricaPanel
                        postId={r.post.id}
                        hoje={hoje}
                        existente={metricas.find((m) => m.post_id === r.post.id && m.data === hoje) ?? null}
                        onDone={handleMetricaSalva}
                        onCancel={() => setOpenRow(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-3 gap-4">
            {[
              { label: "Alcance total", value: totais.alcance },
              { label: "Saves totais", value: totais.saves },
              { label: "Visitas ao perfil", value: totais.visitasPerfil },
            ].map((card) => (
              <div key={card.label} className="rounded-[var(--radius-lg)] p-4" style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[1.2px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                    {card.label}
                  </span>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[.6px] text-text-primary"
                    style={{ background: "var(--color-bege-claro)", fontFamily: "var(--font-body)" }}
                    title="Fase 1: você digita em cada post (botão Métricas). Quando a Graph API do Instagram entrar (Fase 2), atualiza sozinho."
                  >
                    <Info className="h-2.5 w-2.5" strokeWidth={2} />
                    Manual
                  </span>
                </div>
                <div className="mt-1.5 font-display text-[26px] leading-none text-text-primary">{card.value.toLocaleString("pt-BR")}</div>
              </div>
            ))}
          </section>

          <section className="rounded-[var(--radius-lg)] p-5" style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)" }}>
            <h2 className="font-display text-[19px] text-text-primary">Aprender com os melhores</h2>
            <p className="mt-0.5 text-[12.5px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              Os posts que mais geraram lead viram matéria-prima pra novas ideias.
            </p>

            {topPosts.length === 0 ? (
              <p className="mt-4 text-sm text-text-secondary">Ainda sem posts com lead atribuído.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {topPosts.map((r) => (
                  <label
                    key={r.post.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5"
                    style={{ background: "var(--surface-sunken)" }}
                  >
                    <input
                      type="checkbox"
                      checked={selecionados.has(r.post.id)}
                      onChange={() => toggleSelecionado(r.post.id)}
                      className="h-4 w-4 accent-[var(--color-alaranjado)]"
                    />
                    <span className="flex-1 truncate text-[13.5px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                      {r.post.titulo}
                    </span>
                    <span className="text-[12px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                      {r.leadsCount} lead(s)
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleAprender}
                disabled={selecionados.size === 0 || aprenderPending}
                className="flex items-center gap-1.5 rounded-[var(--radius-pill)] px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
                style={{ background: "var(--color-alaranjado)", fontFamily: "var(--font-body)" }}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                {aprenderPending ? "Transformando…" : "Transformar em ideias"}
              </button>
              {aprenderMsg && (
                <span className="text-[12.5px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                  {aprenderMsg}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AtribuirPanel({
  postId,
  onDone,
  onCancel,
}: {
  postId: string;
  onDone: (postId: string, novo: CtaLead) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<PessoaBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionada, setSelecionada] = useState<PessoaBusca | null>(null);
  const [virouAgendamento, setVirouAgendamento] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleQuery(value: string) {
    setQuery(value);
    setSelecionada(null);
    if (value.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    buscarPessoas(value).then((result) => {
      setBuscando(false);
      if (result.success) setResultados(result.pessoas);
    });
  }

  function confirmar() {
    if (!selecionada) return;
    setSalvando(true);
    setErro(null);
    atribuirLead({ postId, pessoaId: selecionada.id, virouAgendamento }).then((result) => {
      setSalvando(false);
      if (!result.success) {
        setErro(result.error);
        return;
      }
      onDone(postId, {
        id: crypto.randomUUID(),
        post_id: postId,
        cliques: 0,
        pessoa_id: selecionada.id,
        virou_agendamento: virouAgendamento,
        pessoa: { nome: selecionada.nome, telefone: selecionada.telefone },
      });
    });
  }

  return (
    <div className="mx-3.5 mb-3.5 flex flex-col gap-2.5 rounded-[var(--radius-md)] bg-card p-3.5" style={{ border: "0.6px solid var(--color-cinza)" }}>
      <label className="text-[10px] font-medium uppercase tracking-[1.6px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
        Buscar aluna/lead por nome ou telefone
      </label>
      <input
        autoFocus
        value={query}
        onChange={(e) => handleQuery(e.target.value)}
        placeholder="Ex.: Maria, 4999…"
        className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-[13px] text-text-primary outline-none"
        style={{ fontFamily: "var(--font-body)" }}
      />
      {buscando && <span className="text-[12px] text-text-secondary">Buscando…</span>}
      {resultados.length > 0 && !selecionada && (
        <div className="flex flex-col gap-1">
          {resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelecionada(p)}
              className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-[13px] text-text-primary hover:bg-[var(--color-bege-claro)]"
              style={{ fontFamily: "var(--font-body)", background: "var(--surface-sunken)" }}
            >
              <span>{p.nome}</span>
              <span className="text-[11.5px] text-text-secondary">{p.telefone}</span>
            </button>
          ))}
        </div>
      )}
      {selecionada && (
        <div className="flex flex-col gap-2.5 rounded-[var(--radius-md)] p-3" style={{ background: "var(--surface-sunken)" }}>
          <span className="text-[13px] font-medium text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
            {selecionada.nome}
          </span>
          <label className="flex items-center gap-2 text-[12.5px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
            <input type="checkbox" checked={virouAgendamento} onChange={(e) => setVirouAgendamento(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--color-alaranjado)]" />
            Virou agendamento
          </label>
        </div>
      )}
      {erro && <span className="text-[12px]" style={{ color: "var(--color-ui-error)" }}>{erro}</span>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-[var(--radius-pill)] border border-border py-2 text-[12.5px] font-medium text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={!selecionada || salvando}
          className="flex-1 rounded-[var(--radius-pill)] py-2 text-[12.5px] font-medium text-white disabled:opacity-60"
          style={{ background: "var(--color-alaranjado)", fontFamily: "var(--font-body)" }}
        >
          {salvando ? "Salvando…" : "Atribuir"}
        </button>
      </div>
    </div>
  );
}

function MetricaPanel({
  postId,
  hoje,
  existente,
  onDone,
  onCancel,
}: {
  postId: string;
  hoje: string;
  existente: Metrica | null;
  onDone: (m: Metrica) => void;
  onCancel: () => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(METRICA_FIELDS.map((f) => [f.key, existente?.[f.key] != null ? String(existente[f.key]) : ""])),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setSalvando(true);
    setErro(null);
    const payload = Object.fromEntries(
      METRICA_FIELDS.map((f) => [f.key, valores[f.key].trim() === "" ? null : Number(valores[f.key])]),
    ) as Omit<Metrica, "post_id" | "data">;

    salvarMetricaManual({ postId, data: hoje, ...payload }).then((result) => {
      setSalvando(false);
      if (!result.success) {
        setErro(result.error);
        return;
      }
      onDone({ post_id: postId, data: hoje, ...payload });
    });
  }

  return (
    <div className="mx-3.5 mb-3.5 flex flex-col gap-2.5 rounded-[var(--radius-md)] bg-card p-3.5" style={{ border: "0.6px solid var(--color-cinza)" }}>
      <span className="text-[10px] font-medium uppercase tracking-[1.6px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
        Métricas manuais de hoje ({hoje})
      </span>
      <div className="grid grid-cols-4 gap-2">
        {METRICA_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-[10.5px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              {f.label}
            </label>
            <input
              type="number"
              min={0}
              value={valores[f.key]}
              onChange={(e) => setValores((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="rounded-[var(--radius-md)] border border-border bg-background px-2 py-1.5 text-[12.5px] text-text-primary outline-none"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
        ))}
      </div>
      {erro && <span className="text-[12px]" style={{ color: "var(--color-ui-error)" }}>{erro}</span>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-[var(--radius-pill)] border border-border py-2 text-[12.5px] font-medium text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="flex-1 rounded-[var(--radius-pill)] py-2 text-[12.5px] font-medium text-white disabled:opacity-60"
          style={{ background: "var(--color-alaranjado)", fontFamily: "var(--font-body)" }}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
