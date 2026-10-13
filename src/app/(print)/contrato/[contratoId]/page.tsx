import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLINIC_CONFIG_ID, DEFAULT_CLINIC_INFO } from "@/lib/clinic-config";
import { montarValoresContrato } from "@/lib/contrato/gerar";
import { mesclarContrato } from "@/lib/contrato/merge";
import { PrintToolbar } from "./print-toolbar";

export const metadata = { title: "Contrato · Corporis" };

export default async function ContratoImpressaoPage({ params }: { params: Promise<{ contratoId: string }> }) {
  const { contratoId } = await params;
  if (!z.string().uuid().safeParse(contratoId).success) notFound();

  const supabase = await createClient();
  const { data: contrato } = await supabase.schema("vendas").from("contrato")
    .select("id, pessoa_id, modelo_id, venda_id, status, corpo_gerado").eq("id", contratoId).maybeSingle();
  if (!contrato) notFound();

  const { data: clinica } = await supabase.schema("crm").from("clinic_config")
    .select("razao_social, documento, nome_comercial, logo_url").eq("id", CLINIC_CONFIG_ID).maybeSingle();

  // Contrato antigo (sem corpo gravado): mescla na hora, sem persistir.
  let corpo = contrato.corpo_gerado;
  if (!corpo && contrato.modelo_id) {
    const { data: modelo } = await supabase.schema("vendas").from("contrato_modelo").select("corpo").eq("id", contrato.modelo_id).maybeSingle();
    if (modelo) corpo = mesclarContrato(modelo.corpo, await montarValoresContrato(supabase, contrato.pessoa_id, contrato.venda_id));
  }
  if (!corpo) notFound();
  const linhas: string[] = corpo.split("\n");

  const razao = clinica?.razao_social ?? DEFAULT_CLINIC_INFO.razao_social;
  const documento = clinica?.documento ?? DEFAULT_CLINIC_INFO.documento;
  const nomeComercial = clinica?.nome_comercial ?? DEFAULT_CLINIC_INFO.nome_comercial;

  return (
    <>
      <style>{`@page { size: A4; margin: 20mm; }`}</style>
      <PrintToolbar voltarHref={`/clientes/${contrato.pessoa_id}?tab=contrato`} />
      <article className="mx-auto my-8 min-h-[297mm] w-[210mm] max-w-full rounded-[var(--radius-md)] border border-border bg-card px-[20mm] py-[18mm] shadow-sm print:m-0 print:min-h-0 print:w-auto print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {clinica?.logo_url ? <img src={clinica.logo_url} alt={nomeComercial} className="mb-2 h-10 w-auto" /> : null}
            <p className="font-display text-lg text-text-primary">{nomeComercial}</p>
            <p className="text-[11px] text-text-secondary">{razao} · {documento}</p>
          </div>
          {contrato.status === "rascunho" ? (
            <span className="rounded-[var(--radius-pill)] border border-border px-3 py-1 text-[11px] uppercase tracking-[1.5px] text-text-secondary">Minuta</span>
          ) : null}
        </header>

        <div className="text-[11.5pt] leading-[1.7] text-text-primary">
          {linhas.map((linha, i) => {
            const titulo = /^(CLÁUSULA |CONTRATO DE )/.test(linha) || linha === "CONTRATADA" || linha === "CONTRATANTE";
            return (
              <p key={i} className={titulo ? "mt-4 font-semibold break-after-avoid" : "min-h-[1em] whitespace-pre-wrap"}>
                {linha}
              </p>
            );
          })}
        </div>
      </article>
    </>
  );
}
