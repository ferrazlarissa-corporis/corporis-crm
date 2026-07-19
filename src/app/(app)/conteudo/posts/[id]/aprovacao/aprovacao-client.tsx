"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { avaliarConformidade, resumoGate } from "@/lib/conteudo/gate";
import { aprovarPost, reprovarPost } from "./actions";

type Post = {
  id: string;
  titulo: string;
  pilar_id: string | null;
  legenda: string | null;
  hashtags: string[];
  lgpd_usa_depoimento: boolean;
  lgpd_consentimento_ref: string | null;
  motivo_reprovacao: string | null;
  status: string;
};
type Slide = {
  id: string;
  ordem: number;
  tipo: "capa" | "conteudo" | "citacao" | "cta";
  texto_titulo: string | null;
  texto_corpo: string | null;
  imagem_url: string | null;
};
type Pilar = { nome: string; cor_token: string } | null;
type Slot = { data: string; horario: string | null } | null;

const STATUS_LABEL: Record<string, string> = {
  em_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export function AprovacaoClient({
  post,
  slides,
  pilar,
  slot,
  trackedLink,
}: {
  post: Post;
  slides: Slide[];
  pilar: Pilar;
  slot: Slot;
  trackedLink: string | null;
}) {
  const [status, setStatus] = useState(post.status);
  const [idx, setIdx] = useState(0);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gate = useMemo(() => {
    const itens = avaliarConformidade({
      legenda: post.legenda,
      slides: slides.map((s) => ({ texto_titulo: s.texto_titulo, texto_corpo: s.texto_corpo })),
      lgpdUsaDepoimento: post.lgpd_usa_depoimento,
      lgpdConsentimentoRef: post.lgpd_consentimento_ref,
    });
    return resumoGate(itens);
  }, [post, slides]);

  const slide = slides[idx];

  function goPrev() {
    setIdx((i) => (i - 1 + slides.length) % slides.length);
  }
  function goNext() {
    setIdx((i) => (i + 1) % slides.length);
  }

  function handleCopyLink() {
    if (!trackedLink) return;
    navigator.clipboard.writeText(trackedLink).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 1800);
    });
  }

  function handleAprovar() {
    setPending(true);
    setError(null);
    aprovarPost(post.id).then((result) => {
      setPending(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus("aprovado");
    });
  }

  function handleReprovar() {
    if (!motivo.trim()) return;
    setPending(true);
    setError(null);
    reprovarPost({ postId: post.id, motivo: motivo.trim() }).then((result) => {
      setPending(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus("reprovado");
      setShowReject(false);
    });
  }

  const statusChipStyle =
    status === "aprovado"
      ? { background: "var(--color-verde)", color: "#fff" }
      : status === "reprovado"
        ? { background: "var(--color-bege-claro)", color: "var(--color-ui-error)" }
        : { background: "var(--color-bege-claro)", color: "var(--color-texto-escuro)" };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-3.5">
        <div className="flex items-center gap-3.5">
          <Link
            href={`/conteudo/posts/${post.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] border border-border bg-card text-text-secondary transition-colors hover:border-[var(--color-bege)] hover:text-[var(--color-alaranjado)]"
            aria-label="Voltar pro editor"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="font-display text-[20px] leading-none text-text-primary">Prévia & aprovação</h1>
            <p className="mt-1 text-[11px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              {post.titulo}
            </p>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[12px] font-medium"
          style={{ ...statusChipStyle, fontFamily: "var(--font-body)" }}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </header>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: "1fr 336px" }}>
        <section className="crm-scrollbar flex justify-center overflow-y-auto px-6 py-8">
          <div className="h-fit w-[400px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2.5 p-3.5">
              <Image src="/brand/logo-cores.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full bg-[var(--color-bege-claro)] object-contain p-1" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-medium text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                  corporis.fisiopilates
                </span>
                <span className="text-[11px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                  Xanxerê, Santa Catarina
                </span>
              </div>
              <MoreHorizontal className="h-[18px] w-[18px] shrink-0 text-text-secondary" strokeWidth={1.6} />
            </div>

            <div className="relative h-[400px] w-[400px] overflow-hidden bg-[var(--color-cinza)]">
              {slide?.imagem_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.imagem_url} alt={slide.texto_titulo ?? ""} className="h-full w-full object-cover" />
              ) : null}
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Slide anterior"
                    className="absolute left-2.5 top-1/2 flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-text-primary shadow-sm transition-colors hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Próximo slide"
                    className="absolute right-2.5 top-1/2 flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-text-primary shadow-sm transition-colors hover:bg-white"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                  <div
                    className="absolute right-3 top-3 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-medium text-white"
                    style={{ background: "rgba(42,31,26,.55)", fontFamily: "var(--font-body)" }}
                  >
                    {idx + 1}/{slides.length}
                  </div>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {slides.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        aria-label={`Ir pro slide ${i + 1}`}
                        onClick={() => setIdx(i)}
                        className="h-[5px] w-[5px] rounded-full transition-transform"
                        style={{ background: i === idx ? "#fff" : "rgba(255,255,255,.5)", transform: i === idx ? "scale(1.3)" : "scale(1)" }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3.5 px-3.5 pb-1.5 pt-3">
              <Heart className="h-[22px] w-[22px] text-text-primary" strokeWidth={1.6} />
              <MessageCircle className="h-[22px] w-[22px] text-text-primary" strokeWidth={1.6} />
              <Send className="h-[22px] w-[22px] text-text-primary" strokeWidth={1.6} />
              <span className="flex-1" />
              <Bookmark className="h-[22px] w-[22px] text-text-primary" strokeWidth={1.6} />
            </div>

            {post.legenda && (
              <p className="px-3.5 pb-1 text-[13px] leading-relaxed text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                <b className="font-medium">corporis.fisiopilates</b> {post.legenda}
              </p>
            )}
            {post.hashtags.length > 0 && (
              <p className="px-3.5 pb-3.5 text-[13px] leading-relaxed text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
                {post.hashtags.join(" ")}
              </p>
            )}
            <p
              className="px-3.5 pb-4 text-[10.5px] font-medium uppercase tracking-[.3px] text-text-secondary"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {slot ? `Agendado · ${format(parseISO(slot.data), "d 'de' MMMM", { locale: ptBR })}${slot.horario ? ` às ${slot.horario.slice(0, 5)}` : ""}` : STATUS_LABEL[status] ?? status}
            </p>
          </div>
        </section>

        <aside className="crm-scrollbar flex flex-col gap-4 overflow-y-auto border-l border-border bg-card p-5">
          <h2 className="font-display text-[18px] text-text-primary">Detalhes</h2>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Pilar
            </span>
            {pilar ? (
              <span
                className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] font-medium text-text-primary"
                style={{ background: "var(--surface-sunken)", fontFamily: "var(--font-body)" }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: `var(--${pilar.cor_token})` }} />
                {pilar.nome}
              </span>
            ) : (
              <span className="text-[13px] text-text-secondary">—</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Data agendada
            </span>
            <span className="flex items-center gap-2 text-[13.5px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
              <Calendar className="h-3.5 w-3.5 shrink-0 text-text-secondary" strokeWidth={1.7} />
              {slot ? `${format(parseISO(slot.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}${slot.horario ? ` · ${slot.horario.slice(0, 5)}` : ""}` : "Ainda não agendado"}
            </span>
          </div>

          <div className="border-t border-dashed border-border pt-4">
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Gate de conformidade
            </span>
            <div className="flex flex-col gap-3 rounded-[var(--radius-md)] p-3.5" style={{ background: "var(--surface-sunken)" }}>
              <div className="flex items-center gap-2 text-[13px] font-medium text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                <Check className="h-4 w-4 shrink-0" strokeWidth={2} style={{ color: gate.podeEnviar ? "var(--gate-ok)" : "var(--gate-block)" }} />
                {gate.podeEnviar ? "Pronto para aprovar" : "Revisar antes de aprovar"}
              </div>
              <div className="flex items-center gap-2 text-[12.5px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                <span className="h-[9px] w-[9px] rounded-full" style={{ background: `var(--gate-${gate.coffito === "ok" ? "ok" : gate.coffito === "alerta" ? "alert" : "block"})` }} />
                <b className="font-medium">COFFITO</b>
                <span className="ml-auto text-text-secondary">{gate.coffito === "ok" ? "Ok" : gate.coffito === "alerta" ? "Alerta" : "Bloqueado"}</span>
              </div>
              <div className="flex items-center gap-2 text-[12.5px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                <span className="h-[9px] w-[9px] rounded-full" style={{ background: `var(--gate-${gate.lgpd === "ok" ? "ok" : gate.lgpd === "alerta" ? "alert" : "block"})` }} />
                <b className="font-medium">LGPD</b>
                <span className="ml-auto text-text-secondary">{gate.lgpd === "ok" ? "Ok" : gate.lgpd === "alerta" ? "Alerta" : "Bloqueado"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Link rastreável
            </span>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={trackedLink ?? "—"}
                className="flex-1 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] px-3 py-2 text-[12.5px] text-text-primary outline-none"
                style={{ fontFamily: "var(--font-body)" }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!trackedLink}
                aria-label="Copiar link"
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] text-text-secondary transition-colors hover:border-[var(--color-bege)] hover:text-[var(--color-alaranjado)] disabled:opacity-60"
              >
                {linkCopiado ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.6} />}
              </button>
            </div>
          </div>

          {post.motivo_reprovacao && status === "reprovado" && (
            <div className="rounded-[var(--radius-md)] p-3" style={{ background: "var(--surface-sunken)" }}>
              <p className="text-[11.5px] font-medium uppercase tracking-[1.4px]" style={{ color: "var(--color-ui-error)", fontFamily: "var(--font-body)" }}>
                Motivo da reprovação
              </p>
              <p className="mt-1 text-[13px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                {post.motivo_reprovacao}
              </p>
            </div>
          )}

          {error && (
            <p className="text-[12.5px]" style={{ color: "var(--color-ui-error)" }}>
              {error}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-2.5 border-t border-dashed border-border pt-4">
            {status === "em_aprovacao" && !showReject && (
              <>
                <button
                  type="button"
                  onClick={handleAprovar}
                  disabled={!gate.podeEnviar || pending}
                  className="rounded-[var(--radius-pill)] px-3 py-3 text-[14px] font-medium transition-colors"
                  style={{
                    background: gate.podeEnviar ? "var(--color-alaranjado)" : "var(--color-cinza)",
                    color: gate.podeEnviar ? "#fff" : "var(--color-texto-medio)",
                    fontFamily: "var(--font-body)",
                    cursor: gate.podeEnviar && !pending ? "pointer" : "not-allowed",
                  }}
                >
                  {pending ? "Aprovando…" : "Aprovar post"}
                </button>
                <Link
                  href={`/conteudo/posts/${post.id}`}
                  className="rounded-[var(--radius-pill)] border border-border px-3 py-3 text-center text-[13.5px] font-medium text-text-primary transition-colors hover:border-[var(--color-bege)] hover:bg-[var(--color-bege-claro)]"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Gerar de novo
                </Link>
                <button
                  type="button"
                  onClick={() => setShowReject(true)}
                  className="rounded-[var(--radius-pill)] p-2 text-center text-[13.5px] font-medium hover:underline"
                  style={{ color: "var(--color-ui-error)", fontFamily: "var(--font-body)" }}
                >
                  Reprovar
                </button>
              </>
            )}

            {status === "em_aprovacao" && showReject && (
              <div className="flex flex-col gap-2.5 rounded-[var(--radius-md)] p-3.5" style={{ background: "var(--surface-sunken)" }}>
                <label
                  className="text-[10px] font-medium uppercase tracking-[1.6px] text-[var(--color-bege)]"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Motivo da reprovação
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex.: linguagem promete resultado rápido, trocar imagem de fundo…"
                  rows={3}
                  className="resize-y rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 text-[13px] text-text-primary outline-none"
                  style={{ fontFamily: "var(--font-body)" }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReject(false);
                      setMotivo("");
                    }}
                    className="flex-1 rounded-[var(--radius-pill)] border border-border py-2 text-[12.5px] font-medium text-text-secondary"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleReprovar}
                    disabled={!motivo.trim() || pending}
                    className="flex-1 rounded-[var(--radius-pill)] py-2 text-[12.5px] font-medium text-white disabled:opacity-60"
                    style={{ background: "var(--color-ui-error)", fontFamily: "var(--font-body)" }}
                  >
                    {pending ? "Enviando…" : "Confirmar reprovação"}
                  </button>
                </div>
              </div>
            )}

            {status === "aprovado" && (
              <p className="text-center text-[13.5px] font-medium" style={{ color: "var(--color-verde)", fontFamily: "var(--font-body)" }}>
                Post aprovado
              </p>
            )}
            {status === "reprovado" && (
              <Link
                href={`/conteudo/posts/${post.id}`}
                className="rounded-[var(--radius-pill)] border border-border px-3 py-3 text-center text-[13.5px] font-medium text-text-primary transition-colors hover:border-[var(--color-bege)] hover:bg-[var(--color-bege-claro)]"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Voltar pro editor
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
