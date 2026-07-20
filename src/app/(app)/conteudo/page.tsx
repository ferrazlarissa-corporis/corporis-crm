import Link from "next/link";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { PainelAguardando, type AguardandoItem } from "./painel-aguardando";

export const metadata = { title: "Painel · Corporis Conteúdo" };

const SLOT_DOT: Record<string, string> = {
  vazio: "var(--slot-empty)",
  rascunho: "var(--slot-draft)",
  agendado: "var(--slot-scheduled)",
  aprovado: "var(--slot-approved)",
  publicado: "var(--slot-published)",
};
const SLOT_LABEL: Record<string, string> = {
  vazio: "Livre",
  rascunho: "Rascunho",
  agendado: "Aguardando",
  aprovado: "Aprovado",
  publicado: "Publicado",
};

export default async function ConteudoPainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.schema("crm").from("profiles").select("nome").eq("id", user.id).maybeSingle()
    : { data: null };
  const primeiroNome = profile?.nome?.split(" ")[0] ?? "";

  const hoje = new Date();
  const hojeIso = format(hoje, "yyyy-MM-dd");
  const semanaInicio = startOfWeek(hoje, { weekStartsOn: 1 });
  const semanaFim = endOfWeek(hoje, { weekStartsOn: 1 });

  const [
    { data: aguardandoPosts },
    { count: leadsCount },
    { count: aguardandoCount },
    { data: proximasSlots },
    { data: semanaSlots },
    { data: pilares },
  ] = await Promise.all([
    supabase
      .schema("conteudo")
      .from("post")
      .select("id, titulo, formato, pilar_id")
      .eq("status", "em_aprovacao")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase.schema("conteudo").from("cta_lead").select("id", { count: "exact", head: true }).not("pessoa_id", "is", null),
    supabase.schema("conteudo").from("post").select("id", { count: "exact", head: true }).eq("status", "em_aprovacao"),
    supabase
      .schema("conteudo")
      .from("slot_calendario")
      .select("data, horario")
      .not("post_id", "is", null)
      .gte("data", hojeIso)
      .order("data", { ascending: true })
      .order("horario", { ascending: true })
      .limit(20),
    supabase
      .schema("conteudo")
      .from("slot_calendario")
      .select("id, data, horario, status, post_id, post:post_id(titulo, pilar_id)")
      .gte("data", format(semanaInicio, "yyyy-MM-dd"))
      .lte("data", format(semanaFim, "yyyy-MM-dd"))
      .order("data"),
    supabase.schema("conteudo").from("pilar_editorial").select("id, nome, cor_token"),
  ]);

  const pilarById = new Map((pilares ?? []).map((p) => [p.id, p]));

  // Monta os itens de "Aguardando você" com contagem de slides, thumb (1º slide) e slot vinculado.
  const postIds = (aguardandoPosts ?? []).map((p) => p.id);
  const [{ data: slidesInfo }, { data: slotsDosPosts }] = await Promise.all([
    postIds.length
      ? supabase.schema("conteudo").from("post_slide").select("post_id, ordem, imagem_url").in("post_id", postIds).order("ordem")
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.schema("conteudo").from("slot_calendario").select("post_id, data, horario").in("post_id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const aguardandoItens: AguardandoItem[] = (aguardandoPosts ?? []).map((post) => {
    const slides = (slidesInfo ?? []).filter((s) => s.post_id === post.id);
    const pilar = post.pilar_id ? pilarById.get(post.pilar_id) : undefined;
    const slot = (slotsDosPosts ?? []).find((s) => s.post_id === post.id);
    return {
      id: post.id,
      titulo: post.titulo,
      formato: post.formato,
      pilarNome: pilar?.nome ?? null,
      pilarCorToken: pilar?.cor_token ?? null,
      totalSlides: slides.length,
      thumbUrl: slides[0]?.imagem_url ?? null,
      slot: slot ? { data: slot.data, horario: slot.horario } : null,
    };
  });

  const proximaPublicacao = proximasSlots?.[0] ?? null;

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i));

  return (
    <div className="flex min-h-dvh flex-col gap-7 p-8">
      <div>
        <h1 className="font-display text-3xl text-text-primary">
          {primeiroNome ? (
            <>
              Olá, <span style={{ color: "var(--color-bege)" }}>{primeiroNome}.</span>
            </>
          ) : (
            "Painel"
          )}
        </h1>
        <p className="type-body-sm mt-1.5 max-w-[560px] text-text-secondary">
          {aguardandoItens.length > 0
            ? `${aguardandoItens.length} post${aguardandoItens.length > 1 ? "s" : ""} esperando sua aprovação.`
            : "Nada esperando aprovação agora."}{" "}
          <Link href="/conteudo/ideias" className="underline decoration-1 underline-offset-2">
            Ir pro Banco de ideias
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}>
        <div className="crm-card flex min-h-[150px] flex-col gap-3.5 p-6">
          <span className="type-ui-label text-text-secondary">Leads atribuídos</span>
          <div className="font-display text-[52px] leading-none text-text-primary">
            {leadsCount ?? 0}
            <span className="ml-2 text-[20px] font-normal text-text-secondary">lead(s)</span>
          </div>
        </div>

        <Link href="/conteudo/metricas" className="crm-card flex min-h-[150px] flex-col gap-3.5 p-6 transition-colors hover:border-[var(--color-bege)]">
          <span className="type-ui-label text-text-secondary">Aguardando aprovação</span>
          <div className="font-display text-[52px] leading-none text-text-primary">{aguardandoCount ?? 0}</div>
          <span className="mt-auto text-[12px] font-medium" style={{ color: "var(--color-alaranjado)", fontFamily: "var(--font-body)" }}>
            Revisar agora →
          </span>
        </Link>

        <Link href="/conteudo/calendario" className="crm-card flex min-h-[150px] flex-col gap-3.5 p-6 transition-colors hover:border-[var(--color-bege)]">
          <span className="type-ui-label text-text-secondary">Próximas publicações</span>
          <div className="font-display text-[52px] leading-none text-text-primary">{proximasSlots?.length ?? 0}</div>
          {proximaPublicacao && (
            <span className="mt-auto text-[12px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              próxima: <b className="font-medium text-text-primary">{format(new Date(`${proximaPublicacao.data}T00:00:00`), "EEEE, d/MM", { locale: ptBR })}</b>
            </span>
          )}
        </Link>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <section className="crm-card p-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-[20px] text-text-primary">Aguardando você</h2>
              <p className="mt-0.5 text-[12.5px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                Posts prontos, falta só o seu OK
              </p>
            </div>
          </div>
          <PainelAguardando initialItens={aguardandoItens} />
        </section>

        <section className="crm-card p-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-[20px] text-text-primary">Semana</h2>
              <p className="mt-0.5 text-[12.5px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                {format(semanaInicio, "d 'de' MMM", { locale: ptBR })} a {format(semanaFim, "d 'de' MMM", { locale: ptBR })}
              </p>
            </div>
            <Link href="/conteudo/calendario" className="shrink-0 text-[12px] font-medium text-text-secondary transition-colors hover:text-[var(--color-alaranjado)]" style={{ fontFamily: "var(--font-body)" }}>
              Calendário →
            </Link>
          </div>
          <div className="flex flex-col">
            {diasSemana.map((dia, i) => {
              const iso = format(dia, "yyyy-MM-dd");
              const slot = (semanaSlots ?? []).find((s) => s.data === iso);
              const post = slot?.post as unknown as { titulo: string; pilar_id: string | null } | null;
              const pilar = post?.pilar_id ? pilarById.get(post.pilar_id) : undefined;
              const isHoje = iso === hojeIso;
              return (
                <div
                  key={iso}
                  className="grid items-center gap-3.5 py-3"
                  style={{ gridTemplateColumns: "40px 1fr auto", borderTop: i === 0 ? "none" : "0.6px solid var(--color-cinza)" }}
                >
                  <div className="text-[11px] font-medium uppercase tracking-[1.6px]" style={{ color: isHoje ? "var(--color-alaranjado)" : "var(--color-texto-medio)", fontFamily: "var(--font-body)" }}>
                    {format(dia, "EEE", { locale: ptBR })}
                    <div className="font-display text-[18px] normal-case leading-none tracking-normal" style={{ color: isHoje ? "var(--color-alaranjado)" : "var(--color-texto-escuro)", marginTop: 3 }}>
                      {format(dia, "d")}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                      {post?.titulo ?? <span className="font-normal italic text-text-secondary">— slot livre</span>}
                    </p>
                    {pilar && (
                      <span className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--${pilar.cor_token})` }} />
                        {pilar.nome}
                      </span>
                    )}
                  </div>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slot ? SLOT_DOT[slot.status] : SLOT_DOT.vazio }} title={slot ? SLOT_LABEL[slot.status] : "Sem slot"} />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
