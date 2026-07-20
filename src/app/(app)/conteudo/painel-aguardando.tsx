"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { aprovarPost } from "./posts/[id]/aprovacao/actions";

export type AguardandoItem = {
  id: string;
  titulo: string;
  formato: string;
  pilarNome: string | null;
  pilarCorToken: string | null;
  totalSlides: number;
  thumbUrl: string | null;
  slot: { data: string; horario: string | null } | null;
};

export function PainelAguardando({ initialItens }: { initialItens: AguardandoItem[] }) {
  const [itens, setItens] = useState(initialItens);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleAprovar(id: string) {
    setPendingId(id);
    setErro(null);
    aprovarPost(id).then((result) => {
      setPendingId(null);
      if (!result.success) {
        setErro(result.error);
        return;
      }
      setItens((prev) => prev.filter((i) => i.id !== id));
    });
  }

  if (itens.length === 0) {
    return <p className="py-6 text-center text-[13.5px] text-text-secondary">Nada esperando aprovação — tudo em dia.</p>;
  }

  return (
    <div className="flex flex-col">
      {erro && (
        <p className="mb-2 text-[12.5px]" style={{ color: "var(--color-ui-error)" }}>
          {erro}
        </p>
      )}
      {itens.map((item, i) => (
        <div
          key={item.id}
          className="grid items-center gap-4 rounded-[var(--radius-md)] px-2 py-3.5 transition-colors hover:bg-[var(--color-bege-claro)]"
          style={{ gridTemplateColumns: "60px 1fr auto", borderTop: i === 0 ? "none" : "0.6px solid var(--color-cinza)" }}
        >
          <div
            className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[var(--radius-md)]"
            style={{
              backgroundImage: item.thumbUrl
                ? `url(${item.thumbUrl})`
                : `linear-gradient(150deg, ${item.pilarCorToken ? `var(--${item.pilarCorToken})` : "var(--color-cinza)"} 0%, var(--color-espresso) 100%)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "var(--surface-sunken)",
            }}
          />
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-medium text-text-primary" style={{ fontFamily: "var(--font-body)" }}>
              {item.titulo}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-text-secondary" style={{ fontFamily: "var(--font-body)" }}>
              {item.pilarNome && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.pilarCorToken ? `var(--${item.pilarCorToken})` : "var(--color-cinza)" }} />
                  {item.pilarNome}
                </span>
              )}
              <span>
                {item.formato === "carrossel" ? `Carrossel · ${item.totalSlides} slides` : "Estático"}
              </span>
              {item.slot && <span>Slot: {new Date(`${item.slot.data}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}{item.slot.horario ? `, ${item.slot.horario.slice(0, 5)}` : ""}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/conteudo/posts/${item.id}/aprovacao`}
              className="rounded-[var(--radius-pill)] border border-border px-3.5 py-2 text-[12px] font-medium text-text-primary"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Ver
            </Link>
            <button
              type="button"
              onClick={() => handleAprovar(item.id)}
              disabled={pendingId === item.id}
              className="flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3.5 py-2 text-[12px] font-medium text-white disabled:opacity-70"
              style={{ background: "var(--color-alaranjado)", fontFamily: "var(--font-body)" }}
            >
              <Check className="h-3 w-3" strokeWidth={2.2} />
              {pendingId === item.id ? "…" : "Aprovar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
