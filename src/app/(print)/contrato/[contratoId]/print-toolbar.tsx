"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ voltarHref }: { voltarHref: string }) {
  return (
    <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
      <Link href={voltarHref} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />Voltar à ficha
      </Link>
      <div className="flex items-center gap-3">
        <p className="hidden text-xs text-text-secondary sm:block">Na janela de impressão, escolha “Salvar como PDF” para exportar.</p>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" strokeWidth={1.5} />Imprimir / salvar PDF
        </Button>
      </div>
    </div>
  );
}
