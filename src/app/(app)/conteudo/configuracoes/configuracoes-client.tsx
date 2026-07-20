"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createPilar, updatePilar, updateTomVoz } from "./actions";

type Pilar = {
  id: string;
  nome: string;
  descricao: string | null;
  publico_alvo: string | null;
  cor_token: string;
  ativo: boolean;
};

const MARCA_TOKENS = [
  { nome: "Terracota", desc: "Cor principal — CTAs, destaques", varName: "--color-alaranjado", hex: "#F08353" },
  { nome: "Areia", desc: "Fundo suave, cards, hover", varName: "--color-bege-claro", hex: "#EAD7AC" },
  { nome: "Sálvia", desc: "Saúde preventiva, fisio pélvica", varName: "--color-verde", hex: "#ACC095" },
  { nome: "Blush", desc: "Hover, gradientes suaves", varName: "--color-tangerina", hex: "#F6A958" },
  { nome: "Carvão", desc: "Texto escuro, fundo dark", varName: "--color-espresso", hex: "#2A1F1A" },
] as const;

const SECTIONS = [
  { id: "marca", label: "Marca" },
  { id: "pilares", label: "Pilares editoriais" },
  { id: "tom", label: "Tom de voz" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function SavedNote({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) return <span className="type-body-sm text-text-secondary">Salvando…</span>;
  if (saved) return <span className="type-body-sm text-[var(--color-verde)]">Salvo</span>;
  return null;
}

export function ConfiguracoesClient({
  pilares,
  tomVoz,
  tomTags,
}: {
  pilares: Pilar[];
  tomVoz: string;
  tomTags: string[];
}) {
  const [section, setSection] = useState<SectionId>("marca");

  return (
    <div className="grid min-h-dvh grid-cols-[220px_1fr]">
      <aside className="border-r border-border px-4 py-8">
        <p className="font-display px-2 text-xl text-text-primary">Corporis</p>
        <p className="type-ui-micro px-2 pb-6 text-text-secondary">Configurações</p>
        <nav className="flex flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                "rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm font-medium transition-colors",
                section === s.id
                  ? "bg-accent-soft text-text-primary"
                  : "text-text-secondary hover:bg-accent-soft/60",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="p-8">
        {section === "marca" && <MarcaTab />}
        {section === "pilares" && <PilaresTab pilares={pilares} />}
        {section === "tom" && <TomVozTab initialTomVoz={tomVoz} tomTags={tomTags} />}
      </main>
    </div>
  );
}

function MarcaTab() {
  return (
    <div className="grid max-w-4xl grid-cols-[1fr_320px] gap-8">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Marca</h1>
        <p className="type-body-sm mt-1 text-text-secondary">
          Tokens de cor e tipografia. Paleta fechada — cinco cores primitivas. Herdados do Corporis
          OS — somente leitura aqui.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {MARCA_TOKENS.map((token) => (
            <div
              key={token.nome}
              className="flex items-center gap-4 rounded-[var(--radius-md)] border border-border bg-card p-4"
            >
              <span
                className="h-9 w-9 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${token.varName})` }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{token.nome}</p>
                <p className="type-body-sm text-text-secondary">{token.desc}</p>
              </div>
              <span
                className="h-9 w-16 shrink-0 rounded-[var(--radius-sm)]"
                style={{ backgroundColor: `var(${token.varName})` }}
              />
              <span className="type-ui-value w-20 shrink-0 text-right text-text-secondary">{token.hex}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--bg-2)] p-5">
          <p className="type-ui-label text-[var(--color-bege)]">Fontes</p>
          <div className="mt-3 flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm text-text-secondary">Display</span>
            <span className="text-sm text-text-primary">Olicy (Quicksand — substituto)</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-text-secondary">Corpo</span>
            <span className="text-sm text-text-primary">Ubuntu</span>
          </div>
        </div>

        <p className="type-body-sm mt-4 text-text-secondary">
          Tokens de aplicação do módulo (pilares, status, gate de conformidade) documentados em{" "}
          <code className="text-xs">design-system/app-tokens.css</code>.
        </p>
      </div>

      <div>
        <p className="type-ui-label text-text-secondary">Preview ao vivo — slide capa</p>
        <div className="mt-3 aspect-[4/5] rounded-[var(--radius-lg)] bg-[var(--color-espresso)] p-8 shadow-lg">
          <p className="type-ui-label text-[var(--color-bege-claro)]">Fisio Pélvica</p>
          <p className="font-display mt-3 text-3xl leading-tight text-[var(--color-fundo-claro)]">
            Movimente-se com propósito
          </p>
          <div className="mt-24 h-px w-10 bg-[var(--color-alaranjado)]" />
          <p className="type-body-sm mt-4 text-[var(--color-bege-claro)]">Atendimento individual, no seu ritmo.</p>
          <span className="mt-5 inline-block rounded-[var(--radius-pill)] bg-[var(--color-alaranjado)] px-5 py-2.5 text-sm font-medium text-white">
            Aula experimental →
          </span>
        </div>
      </div>
    </div>
  );
}

function PilaresTab({ pilares: initialPilares }: { pilares: Pilar[] }) {
  const [pilares, setPilares] = useState(initialPilares);
  const [isCreating, startCreating] = useTransition();

  function handleCreate() {
    startCreating(async () => {
      const result = await createPilar({ nome: "Novo pilar" });
      if (result.success && result.id) {
        setPilares((prev) => [
          ...prev,
          { id: result.id!, nome: "Novo pilar", descricao: null, publico_alvo: null, cor_token: "pillar-indefinido", ativo: true },
        ]);
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl text-text-primary">Pilares editoriais</h1>
      <p className="type-body-sm mt-1 text-text-secondary">
        Pilares de conteúdo. Cada um guia a IA sobre tema, tom e público.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {pilares.map((pilar) => (
          <PilarRow key={pilar.id} pilar={pilar} />
        ))}
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={isCreating}
        className="type-ui-label mt-3 w-full rounded-[var(--radius-md)] border border-dashed border-[var(--color-bege)] py-3 text-[var(--color-alaranjado)] transition-colors hover:bg-accent-soft disabled:opacity-60"
      >
        {isCreating ? "Criando…" : "+ Novo pilar"}
      </button>
    </div>
  );
}

function PilarRow({ pilar }: { pilar: Pilar }) {
  const [nome, setNome] = useState(pilar.nome);
  const [descricao, setDescricao] = useState(pilar.descricao ?? "");
  const [publicoAlvo, setPublicoAlvo] = useState(pilar.publico_alvo ?? "");
  const [ativo, setAtivo] = useState(pilar.ativo);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save(next: Partial<{ nome: string; descricao: string; publico_alvo: string; ativo: boolean }>) {
    setSaved(false);
    startTransition(async () => {
      const result = await updatePilar({
        id: pilar.id,
        nome: next.nome ?? nome,
        descricao: next.descricao ?? descricao,
        publico_alvo: next.publico_alvo ?? publicoAlvo,
        ativo: next.ativo ?? ativo,
      });
      if (result.success) setSaved(true);
    });
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-border bg-card p-4 transition-opacity",
        !ativo && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: `var(--${pilar.cor_token})` }}
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => save({ nome })}
            className="h-auto border-none bg-transparent px-0 py-0.5 text-base font-medium text-text-primary shadow-none focus-visible:ring-0"
          />
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            onBlur={() => save({ descricao })}
            placeholder="Descrição do pilar"
            className="h-auto border-none bg-transparent px-0 py-0.5 text-sm text-text-secondary shadow-none focus-visible:ring-0"
          />
          <Input
            value={publicoAlvo}
            onChange={(e) => setPublicoAlvo(e.target.value)}
            onBlur={() => save({ publico_alvo: publicoAlvo })}
            placeholder="Público-alvo"
            className="type-body-sm h-auto border-none bg-transparent px-0 py-0.5 text-text-secondary shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Switch
            checked={ativo}
            onChange={(checked) => {
              setAtivo(checked);
              save({ ativo: checked });
            }}
          />
          <SavedNote saving={isPending} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function TomVozTab({ initialTomVoz, tomTags }: { initialTomVoz: string; tomTags: string[] }) {
  const [tomVoz, setTomVoz] = useState(initialTomVoz);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(false);
    startTransition(async () => {
      const result = await updateTomVoz({ tom_voz: tomVoz });
      if (result.success) setSaved(true);
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl text-text-primary">Tom de voz</h1>
      <p className="type-body-sm mt-1 text-text-secondary">Este texto guia toda geração de copy pela IA.</p>

      <Textarea
        value={tomVoz}
        onChange={(e) => setTomVoz(e.target.value)}
        onBlur={save}
        className="mt-6 min-h-[160px] resize-y bg-card text-[15px] leading-relaxed"
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {tomTags.map((tag) => (
            <span
              key={tag}
              className="type-ui-label rounded-[var(--radius-pill)] bg-accent-soft px-3.5 py-1.5 text-[var(--color-espresso)]"
            >
              {tag}
            </span>
          ))}
        </div>
        <SavedNote saving={isPending} saved={saved} />
      </div>
    </div>
  );
}
