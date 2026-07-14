"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type SubmeterResult = { success: true } | { success: false; error: string };

const MAX_PDF_BYTES = 8 * 1024 * 1024;

const payloadSchema = z.object({
  token: z.string().uuid(),
  dados: z.record(z.string(), z.unknown()),
});

export async function submeterAnamnesePublica(formData: FormData): Promise<SubmeterResult> {
  const token = String(formData.get("token") ?? "");
  const dadosRaw = String(formData.get("dados") ?? "");
  const pdf = formData.get("pdf");

  let dados: Record<string, unknown>;
  try {
    dados = JSON.parse(dadosRaw);
  } catch {
    return { success: false, error: "Dados do formulário inválidos." };
  }

  const parsed = payloadSchema.safeParse({ token, dados });
  if (!parsed.success) return { success: false, error: "Dados do formulário inválidos." };
  if (!(pdf instanceof File) || pdf.size === 0) return { success: false, error: "PDF não foi gerado corretamente." };
  if (pdf.size > MAX_PDF_BYTES) return { success: false, error: "PDF muito grande." };
  if (pdf.type && pdf.type !== "application/pdf") return { success: false, error: "Arquivo inválido." };

  const supabase = createServiceRoleClient();

  const { data: convite, error: conviteError } = await supabase
    .schema("clinico")
    .from("anamnese_convite")
    .select("id, pessoa_id, expira_em, usado_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (conviteError || !convite) return { success: false, error: "Link inválido." };
  if (convite.usado_at) return { success: false, error: "Este link já foi utilizado." };
  if (new Date(convite.expira_em).getTime() < Date.now()) return { success: false, error: "Este link expirou." };

  const { data: ultima } = await supabase
    .schema("clinico")
    .from("anamnese")
    .select("versao")
    .eq("pessoa_id", convite.pessoa_id)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const versao = (ultima?.versao ?? 0) + 1;

  const pdfPath = `${convite.pessoa_id}/anamnese/v${versao}.pdf`;
  const { error: uploadError } = await supabase.storage.from("clinico").upload(pdfPath, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) return { success: false, error: "Não foi possível salvar o PDF." };

  const assinadoAt = new Date().toISOString();
  const { error: insertError } = await supabase.schema("clinico").from("anamnese").insert({
    pessoa_id: convite.pessoa_id,
    versao,
    dados: parsed.data.dados as never,
    autor_id: null,
    pdf_path: pdfPath,
    assinado_at: assinadoAt,
    origem: "publico",
  });
  if (insertError) return { success: false, error: "Não foi possível salvar a ficha." };

  try {
    await supabase.schema("clinico").from("acesso_log").insert({
      pessoa_id: convite.pessoa_id, tabela: "anamnese", acao: "insert", ator_id: null,
    });
  } catch {
    // auditoria é best-effort — não bloqueia a submissão do cliente
  }

  await supabase.schema("clinico").from("anamnese_convite").update({ usado_at: assinadoAt }).eq("id", convite.id);

  return { success: true };
}
