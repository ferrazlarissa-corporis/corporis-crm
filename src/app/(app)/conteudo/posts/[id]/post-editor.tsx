"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Copy, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProvedorGeracao, StatusGeracao, TipoTemplate } from "@/types/database";
import { avaliarConformidade, resumoGate } from "@/lib/conteudo/gate";
import {
  createSlide,
  deleteSlide,
  enviarParaAprovacao,
  gerarFundo,
  gerarLegendaEHashtags,
  reorderSlides,
  selecionarVersaoFundo,
  updateLegendaHashtags,
  updateLgpd,
  updatePostBriefing,
  updateSlideTemplate,
  updateSlideTexto,
} from "./actions";

type Post = {
  id: string;
  titulo: string;
  formato: string;
  pilar_id: string | null;
  briefing: string | null;
  publico_alvo: string | null;
  legenda: string | null;
  hashtags: string[];
  lgpd_usa_depoimento: boolean;
  lgpd_consentimento_ref: string | null;
  status: string;
};
type Slide = {
  id: string;
  ordem: number;
  template_id: string | null;
  texto_titulo: string | null;
  texto_corpo: string | null;
  fundo_geracao_id: string | null;
  imagem_url: string | null;
};
type Geracao = { id: string; slide_id: string | null; versao: number; status: StatusGeracao; imagem_url: string | null; provedor: ProvedorGeracao };
type Pilar = { id: string; nome: string; cor_token: string; ativo: boolean };
type TemplateOpt = { id: string; nome: string; tipo: TipoTemplate };

const TEMPLATE_LABEL: Record<TipoTemplate, string> = {
  capa: "Capa",
  conteudo: "Conteúdo",
  citacao: "Citação",
  cta: "CTA",
};

function SortableRailItem({
  slide,
  index,
  total,
  selected,
  template,
  templates,
  onSelect,
  onDelete,
  onTemplateChange,
  disableDelete,
}: {
  slide: Slide;
  index: number;
  total: number;
  selected: boolean;
  template: TemplateOpt | undefined;
  templates: TemplateOpt[];
  onSelect: () => void;
  onDelete: () => void;
  onTemplateChange: (templateId: string) => void;
  disableDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className="group relative cursor-pointer rounded-[var(--radius-md)] p-1.5 transition-colors"
    >
      <div
        className="relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-[var(--radius-xs)] p-2"
        style={{
          backgroundImage: slide.imagem_url ? `url(${slide.imagem_url})` : undefined,
          backgroundColor: "var(--color-cinza)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          outline: selected ? "2px solid var(--color-alaranjado)" : "2px solid transparent",
          outlineOffset: 2,
        }}
      >
        <span
          className="mb-1 text-[6.5px] font-medium uppercase tracking-[1px] text-white/85"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {template ? TEMPLATE_LABEL[template.tipo] : "—"}
        </span>
        <span
          className="line-clamp-3 text-[10px] leading-[1.15] text-white"
          style={{ fontFamily: "var(--font-display)", textShadow: "0 1px 3px rgba(0,0,0,.4)" }}
        >
          {slide.texto_titulo || "Sem título"}
        </span>
        {!disableDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Remover slide"
            className="absolute right-1 top-1 hidden h-[18px] w-[18px] items-center justify-center rounded-full bg-black/50 text-white group-hover:flex"
          >
            <Trash2 className="h-2.5 w-2.5" strokeWidth={2.2} />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <span className="shrink-0 text-[10px] font-medium text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
          {index + 1}/{total}
        </span>
        <select
          value={template?.id ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="min-w-0 flex-1 rounded-[var(--radius-xs)] border border-border bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10.5px] text-text-primary outline-none"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function PostEditor({
  post,
  initialSlides,
  geracoes,
  pilares,
  templates,
  trackedLink,
}: {
  post: Post;
  initialSlides: Slide[];
  geracoes: Geracao[];
  pilares: Pilar[];
  templates: TemplateOpt[];
  trackedLink: string | null;
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [versoes, setVersoes] = useState(geracoes);
  const [selectedId, setSelectedId] = useState(initialSlides[0]?.id ?? null);
  const [provedor, setProvedor] = useState<ProvedorGeracao>("gemini");
  const [gerando, setGerando] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [pilarId, setPilarId] = useState(post.pilar_id ?? "");
  const [publicoAlvo, setPublicoAlvo] = useState(post.publico_alvo ?? "");
  const [legenda, setLegenda] = useState(post.legenda ?? "");
  const [hashtags, setHashtags] = useState(post.hashtags ?? []);
  const [hashtagInput, setHashtagInput] = useState("");
  const [legendaPending, setLegendaPending] = useState(false);
  const [legendaError, setLegendaError] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [briefing, setBriefing] = useState(post.briefing ?? "");
  const [lgpdUsaDepoimento, setLgpdUsaDepoimento] = useState(post.lgpd_usa_depoimento);
  const [lgpdConsentimentoRef, setLgpdConsentimentoRef] = useState(post.lgpd_consentimento_ref ?? "");
  const [postStatus, setPostStatus] = useState(post.status);
  const [enviando, setEnviando] = useState(false);
  const [enviarErro, setEnviarErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const selected = slides.find((s) => s.id === selectedId) ?? null;
  const selectedIndex = slides.findIndex((s) => s.id === selectedId);
  const selectedTemplate = selected?.template_id ? templateById.get(selected.template_id) : undefined;
  const slideVersoes = useMemo(
    () => versoes.filter((v) => v.slide_id === selectedId).sort((a, b) => a.versao - b.versao),
    [versoes, selectedId],
  );

  const gate = useMemo(() => {
    const itens = avaliarConformidade({
      legenda,
      slides: slides.map((s) => ({ texto_titulo: s.texto_titulo, texto_corpo: s.texto_corpo })),
      lgpdUsaDepoimento,
      lgpdConsentimentoRef,
    });
    return resumoGate(itens);
  }, [legenda, slides, lgpdUsaDepoimento, lgpdConsentimentoRef]);

  const [tituloDraft, setTituloDraft] = useState(selected?.texto_titulo ?? "");
  const [corpoDraft, setCorpoDraft] = useState(selected?.texto_corpo ?? "");
  const [draftForId, setDraftForId] = useState(selectedId);
  if (draftForId !== selectedId) {
    setDraftForId(selectedId);
    setTituloDraft(selected?.texto_titulo ?? "");
    setCorpoDraft(selected?.texto_corpo ?? "");
  }

  function patchSlide(id: string, patch: Partial<Slide>) {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setGenError(null);
  }

  function handleAddSlide() {
    const defaultTemplate = templates.find((t) => t.tipo === "conteudo") ?? templates[0];
    if (!defaultTemplate) return;
    startTransition(async () => {
      const result = await createSlide({ postId: post.id, templateId: defaultTemplate.id });
      if (result.success && result.slideId) {
        const novo: Slide = {
          id: result.slideId,
          ordem: slides.length + 1,
          template_id: defaultTemplate.id,
          texto_titulo: "Novo slide",
          texto_corpo: "Escreva o corpo deste slide.",
          fundo_geracao_id: null,
          imagem_url: result.imagemUrl ?? null,
        };
        setSlides((prev) => [...prev, novo]);
        setSelectedId(novo.id);
      }
    });
  }

  function handleDeleteSlide(id: string) {
    if (slides.length <= 1) return;
    const idx = slides.findIndex((s) => s.id === id);
    const prevSlides = slides;
    const next = slides.filter((s) => s.id !== id);
    setSlides(next);
    if (selectedId === id) setSelectedId(next[Math.max(0, idx - 1)]?.id ?? null);
    deleteSlide({ slideId: id, postId: post.id }).then((result) => {
      if (!result.success) setSlides(prevSlides);
    });
  }

  function handleTemplateChange(slideId: string, templateId: string) {
    patchSlide(slideId, { template_id: templateId });
    updateSlideTemplate({ slideId, postId: post.id, templateId }).then((result) => {
      if (result.success && result.imagemUrl) patchSlide(slideId, { imagem_url: result.imagemUrl });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(slides, oldIndex, newIndex);
    setSlides(reordered);
    reorderSlides({ postId: post.id, orderedIds: reordered.map((s) => s.id) });
  }

  function saveTexto() {
    if (!selected) return;
    patchSlide(selected.id, { texto_titulo: tituloDraft, texto_corpo: corpoDraft });
    updateSlideTexto({ slideId: selected.id, postId: post.id, texto_titulo: tituloDraft, texto_corpo: corpoDraft }).then(
      (result) => {
        if (result.success && result.imagemUrl) {
          patchSlide(selected.id, { imagem_url: result.imagemUrl });
        }
      },
    );
  }

  function handleGerarFundo() {
    if (!selected) return;
    setGerando(true);
    setGenError(null);
    gerarFundo({ slideId: selected.id, postId: post.id, provedor }).then((result) => {
      setGerando(false);
      if (!result.success) {
        setGenError(result.error);
        return;
      }
      patchSlide(selected.id, { imagem_url: result.imagemUrl, fundo_geracao_id: result.geracaoId });
      setVersoes((prev) => [
        ...prev,
        { id: result.geracaoId, slide_id: selected.id, versao: result.versao, status: "pronto", imagem_url: result.imagemUrl, provedor },
      ]);
    });
  }

  function handleSelectVersao(geracaoId: string) {
    if (!selected) return;
    selecionarVersaoFundo({ slideId: selected.id, postId: post.id, geracaoId }).then((result) => {
      if (result.success && result.imagemUrl) {
        patchSlide(selected.id, { fundo_geracao_id: geracaoId, imagem_url: result.imagemUrl });
      }
    });
  }

  function saveBriefing(patch: Partial<{ pilar_id: string; publico_alvo: string; briefing: string }>) {
    updatePostBriefing({
      postId: post.id,
      pilar_id: patch.pilar_id ?? (pilarId || null),
      publico_alvo: patch.publico_alvo ?? (publicoAlvo || null),
      briefing: patch.briefing ?? (briefing || null),
    });
  }

  function saveLegenda() {
    updateLegendaHashtags({ postId: post.id, legenda });
  }

  function addHashtag() {
    const raw = hashtagInput.trim().replace(/\s+/g, "");
    if (!raw) return;
    const tag = raw.startsWith("#") ? raw : `#${raw}`;
    if (hashtags.includes(tag)) {
      setHashtagInput("");
      return;
    }
    const next = [...hashtags, tag];
    setHashtags(next);
    setHashtagInput("");
    updateLegendaHashtags({ postId: post.id, hashtags: next });
  }

  function removeHashtag(tag: string) {
    const next = hashtags.filter((h) => h !== tag);
    setHashtags(next);
    updateLegendaHashtags({ postId: post.id, hashtags: next });
  }

  function handleGerarLegenda() {
    setLegendaPending(true);
    setLegendaError(null);
    gerarLegendaEHashtags(post.id).then((result) => {
      setLegendaPending(false);
      if (!result.success) {
        setLegendaError(result.error);
        return;
      }
      setLegenda(result.legenda);
      setHashtags(result.hashtags);
    });
  }

  function handleCopyLink() {
    if (!trackedLink) return;
    navigator.clipboard.writeText(trackedLink).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 1800);
    });
  }

  function toggleUsaDepoimento(checked: boolean) {
    setLgpdUsaDepoimento(checked);
    updateLgpd({ postId: post.id, lgpd_usa_depoimento: checked, lgpd_consentimento_ref: lgpdConsentimentoRef || null });
  }

  function saveConsentimentoRef() {
    updateLgpd({ postId: post.id, lgpd_usa_depoimento: lgpdUsaDepoimento, lgpd_consentimento_ref: lgpdConsentimentoRef || null });
  }

  function handleEnviarAprovacao() {
    setEnviando(true);
    setEnviarErro(null);
    enviarParaAprovacao(post.id).then((result) => {
      setEnviando(false);
      if (!result.success) {
        setEnviarErro(result.error);
        return;
      }
      setPostStatus("em_aprovacao");
    });
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-3.5">
        <div className="flex items-center gap-3.5">
          <Link
            href="/conteudo"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] border border-border bg-card text-text-secondary transition-colors hover:border-[var(--color-bege)] hover:text-[var(--color-alaranjado)]"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="font-display text-[20px] leading-none text-text-primary">{post.titulo}</h1>
            <p className="mt-1 text-[11px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              Carrossel · slide {selectedIndex + 1} de {slides.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
          <Check className="h-3.5 w-3.5" strokeWidth={1.8} style={{ color: "var(--color-verde)" }} />
          Salvo automaticamente
        </div>
      </header>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: "236px 1fr 336px" }}>
        <aside className="crm-scrollbar flex flex-col gap-3 overflow-y-auto border-r border-border p-3">
          <span className="px-1 text-[11px] font-medium uppercase tracking-[1.5px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
            Slides
          </span>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2.5">
                {slides.map((s, i) => (
                  <SortableRailItem
                    key={s.id}
                    slide={s}
                    index={i}
                    total={slides.length}
                    selected={s.id === selectedId}
                    template={s.template_id ? templateById.get(s.template_id) : undefined}
                    templates={templates}
                    onSelect={() => handleSelect(s.id)}
                    onDelete={() => handleDeleteSlide(s.id)}
                    onTemplateChange={(templateId) => handleTemplateChange(s.id, templateId)}
                    disableDelete={slides.length <= 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={handleAddSlide}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border px-3 py-2.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:border-[var(--color-alaranjado)] hover:text-[var(--color-alaranjado)]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Slide
          </button>
        </aside>

        <section className="crm-scrollbar flex flex-col items-center gap-4 overflow-y-auto px-6 py-6">
          {selected ? (
            <>
              <div className="flex w-full max-w-[420px] items-center justify-between">
                <span className="text-[13px] font-medium text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                  {selectedTemplate ? TEMPLATE_LABEL[selectedTemplate.tipo] : "—"}{" "}
                  <span className="font-normal text-text-secondary">
                    · {selectedIndex + 1}/{slides.length}
                  </span>
                </span>
                <select
                  value={provedor}
                  onChange={(e) => setProvedor(e.target.value as ProvedorGeracao)}
                  className="rounded-[var(--radius-pill)] border border-border bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] text-text-secondary outline-none"
                >
                  <option value="gemini">Nano Banana (padrão)</option>
                  <option value="openai">GPT Image (premium)</option>
                </select>
              </div>

              <div
                className="w-full max-w-[420px] overflow-hidden rounded-[var(--radius-lg)] shadow-md"
                style={{ aspectRatio: "4 / 5", backgroundColor: "var(--color-cinza)" }}
              >
                {selected.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imagem_url} alt={selected.texto_titulo ?? "Slide"} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="flex w-full max-w-[420px] flex-col gap-2">
                <input
                  value={tituloDraft}
                  onChange={(e) => setTituloDraft(e.target.value)}
                  onBlur={saveTexto}
                  placeholder="Título do slide"
                  className="w-full rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-[13px] text-text-primary outline-none"
                  style={{ fontFamily: "var(--font-body)" }}
                />
                {selectedTemplate?.tipo !== "capa" && (
                  <textarea
                    value={corpoDraft}
                    onChange={(e) => setCorpoDraft(e.target.value)}
                    onBlur={saveTexto}
                    placeholder="Corpo do slide"
                    rows={2}
                    className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-[13px] text-text-primary outline-none"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                )}
              </div>

              {genError && (
                <p className="w-full max-w-[420px] text-[12px]" style={{ color: "var(--color-ui-error)" }}>
                  {genError}
                </p>
              )}

              <div className="flex w-full max-w-[420px] items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleGerarFundo}
                  disabled={gerando}
                  className="flex-1 rounded-[var(--radius-pill)] px-3 py-2.5 text-[13px] font-medium text-white transition-colors disabled:opacity-70"
                  style={{ background: "var(--color-alaranjado)", fontFamily: "var(--font-body)" }}
                >
                  {gerando ? "Gerando…" : slideVersoes.length ? "Gerar outra base" : "Gerar fundo"}
                </button>
              </div>

              {slideVersoes.length > 0 && (
                <div className="flex w-full max-w-[420px] items-center gap-2">
                  <span
                    className="shrink-0 text-[10px] font-medium uppercase tracking-[1.6px] text-text-secondary"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Versões
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {slideVersoes.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectVersao(v.id)}
                        className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] font-medium transition-colors"
                        style={{
                          fontFamily: "var(--font-body)",
                          background: selected.fundo_geracao_id === v.id ? "var(--color-bege-claro)" : "var(--surface-sunken)",
                          color: "var(--color-texto-escuro)",
                          border: `0.6px solid ${selected.fundo_geracao_id === v.id ? "var(--color-bege)" : "transparent"}`,
                        }}
                      >
                        v{v.versao}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-text-secondary">Nenhum slide.</p>
          )}
        </section>

        <aside className="crm-scrollbar flex flex-col gap-4 overflow-y-auto border-l border-border bg-card p-5">
          <h2 className="font-display text-[18px] text-text-primary">Briefing</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Pilar
            </label>
            <select
              value={pilarId}
              onChange={(e) => {
                setPilarId(e.target.value);
                saveBriefing({ pilar_id: e.target.value });
              }}
              className="rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] px-3 py-2.5 text-[13.5px] text-text-primary outline-none"
            >
              <option value="">Sem pilar</option>
              {pilares.filter((p) => p.ativo).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Público-alvo
            </label>
            <input
              value={publicoAlvo}
              onChange={(e) => setPublicoAlvo(e.target.value)}
              onBlur={() => saveBriefing({ publico_alvo: publicoAlvo })}
              placeholder="Ex.: Gestantes, Pós-parto…"
              className="rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] px-3 py-2.5 text-[13.5px] text-text-primary outline-none"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Briefing
            </label>
            <textarea
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              onBlur={() => saveBriefing({ briefing })}
              placeholder="O que esse carrossel precisa comunicar?"
              rows={3}
              className="resize-y rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] px-3 py-2.5 text-[13.5px] text-text-primary outline-none"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          <div className="border-t border-dashed border-border pt-4" />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
                Legenda
              </label>
              <button
                type="button"
                onClick={handleGerarLegenda}
                disabled={legendaPending}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-bege)] px-3 py-1.5 text-[11.5px] font-medium text-text-primary transition-colors hover:bg-[var(--color-bege-claro)] disabled:opacity-70"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <Sparkles className="h-3 w-3" strokeWidth={1.8} style={{ color: "var(--color-bege)" }} />
                {legendaPending ? "Gerando…" : "Gerar legenda"}
              </button>
            </div>
            {legendaError && (
              <p className="text-[11.5px]" style={{ color: "var(--color-ui-error)" }}>
                {legendaError}
              </p>
            )}
            <textarea
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              onBlur={saveLegenda}
              placeholder="Legenda em tom acolhedor…"
              rows={5}
              className="resize-y rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] px-3 py-2.5 text-[13.5px] text-text-primary outline-none"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Hashtags
            </label>
            <div className="flex flex-wrap gap-1.5 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] p-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card py-1 pl-2.5 pr-1 text-[12px] text-text-primary"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeHashtag(tag)}
                    className="flex h-3.5 w-3.5 items-center justify-center text-text-secondary"
                    aria-label={`Remover ${tag}`}
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </span>
              ))}
              <input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHashtag();
                  }
                }}
                onBlur={addHashtag}
                placeholder="adicionar e pressionar Enter"
                className="min-w-[100px] flex-1 border-0 bg-transparent p-1 text-[12px] text-text-primary outline-none"
                style={{ fontFamily: "var(--font-body)" }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
              Link rastreável
            </label>
            <p className="-mt-0.5 text-[11px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              CTA de agendamento — usado na bio e nos stories
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={trackedLink ?? "—"}
                className="flex-1 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] px-3 py-2 text-[13px] text-text-primary outline-none"
                style={{ fontFamily: "var(--font-body)" }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!trackedLink}
                aria-label="Copiar link"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] text-text-secondary transition-colors hover:border-[var(--color-bege)] hover:text-[var(--color-alaranjado)] disabled:opacity-60"
              >
                {linkCopiado ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-dashed border-border pt-4">
            <label className="flex cursor-pointer items-start gap-2.5">
              <span className="relative mt-0.5 h-[21px] w-9 shrink-0">
                <input
                  type="checkbox"
                  checked={lgpdUsaDepoimento}
                  onChange={(e) => toggleUsaDepoimento(e.target.checked)}
                  className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
                />
                <span
                  className="absolute inset-0 rounded-[var(--radius-pill)] transition-colors"
                  style={{ background: lgpdUsaDepoimento ? "var(--color-alaranjado)" : "var(--color-cinza)" }}
                />
                <span
                  className="absolute top-[2px] h-[17px] w-[17px] rounded-[var(--radius-pill)] bg-white shadow-sm transition-transform"
                  style={{ left: 2, transform: lgpdUsaDepoimento ? "translateX(15px)" : "translateX(0)" }}
                />
              </span>
              <span className="text-[12.5px] leading-[1.4] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
                Este post usa depoimento ou imagem real de uma aluna
              </span>
            </label>

            {lgpdUsaDepoimento && (
              <div className="flex flex-col gap-1.5 pl-[46px]">
                <label className="text-[10px] font-medium uppercase tracking-[2px] text-[var(--color-bege)]" style={{ fontFamily: "var(--font-body)" }}>
                  Referência da autorização
                </label>
                <input
                  value={lgpdConsentimentoRef}
                  onChange={(e) => setLgpdConsentimentoRef(e.target.value)}
                  onBlur={saveConsentimentoRef}
                  placeholder="Ex.: termo assinado em 12/03 — pasta Drive/Consentimentos"
                  className="rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)] px-3 py-2 text-[13px] text-text-primary outline-none"
                  style={{ fontFamily: "var(--font-body)" }}
                />
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="flex items-center gap-5 border-t border-border bg-card px-6" style={{ height: "var(--gate-h, 64px)" }}>
        <div className="flex items-center gap-2 text-[13px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--gate-${gate.coffito === "ok" ? "ok" : gate.coffito === "alerta" ? "alert" : "block"})` }} />
          <b className="font-medium">COFFITO</b>
          <span className="text-text-secondary">{gate.coffito === "ok" ? "OK" : gate.coffito === "alerta" ? "Alerta" : "Bloqueado"}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--gate-${gate.lgpd === "ok" ? "ok" : gate.lgpd === "alerta" ? "alert" : "block"})` }} />
          <b className="font-medium">LGPD</b>
          <span className="text-text-secondary">{gate.lgpd === "ok" ? "OK" : gate.lgpd === "alerta" ? "Alerta" : "Bloqueado"}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px]" style={{ fontFamily: "var(--font-body)", color: "var(--gate-block)" }}>
          {!gate.podeEnviar && (
            <>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
              <span className="truncate">{gate.motivoBloqueio}</span>
            </>
          )}
          {enviarErro && <span className="truncate">{enviarErro}</span>}
        </div>
        {postStatus === "em_aprovacao" ? (
          <span className="shrink-0 text-[13px] font-medium" style={{ fontFamily: "var(--font-body)", color: "var(--color-verde)" }}>
            Enviado para aprovação
          </span>
        ) : (
          <button
            type="button"
            onClick={handleEnviarAprovacao}
            disabled={!gate.podeEnviar || enviando}
            className="shrink-0 rounded-[var(--radius-pill)] px-5 py-2.5 text-[13.5px] font-medium transition-colors"
            style={{
              background: gate.podeEnviar ? "var(--color-alaranjado)" : "var(--color-cinza)",
              color: gate.podeEnviar ? "#fff" : "var(--color-texto-medio)",
              fontFamily: "var(--font-body)",
              cursor: gate.podeEnviar && !enviando ? "pointer" : "not-allowed",
            }}
          >
            {enviando ? "Enviando…" : "Enviar para aprovação"}
          </button>
        )}
      </footer>
    </div>
  );
}
