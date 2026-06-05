import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTextMessage } from "@/lib/evolution/client";
import type { LeadStage, LeadInterest } from "@/types/database";

interface CampaignSegment {
  dias_inativo?: number;
  estagios?: LeadStage[];
  interesses?: LeadInterest[];
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const db = supabase.schema("crm");
  const now = new Date();

  // Find campaigns due to run
  const { data: campaigns } = await db
    .from("campaigns")
    .select("*, message_templates!inner(*)")
    .eq("status", "agendada")
    .lte("agendada_para", now.toISOString());

  let totalProcessed = 0;

  for (const campaign of campaigns ?? []) {
    await db.from("campaigns").update({ status: "enviando" }).eq("id", campaign.id);

    const seg = (campaign.segmento ?? {}) as CampaignSegment;

    // Build lead query based on segmentation
    let query = db.from("leads").select("id, nome, telefone, conversations!inner(lead_id, janela_24h_expira_at)")
      .is("archived_at", null)
      .not("estagio", "in", "(convertido,perdido)");

    if (seg.estagios?.length) {
      query = query.in("estagio", seg.estagios);
    }
    if (seg.interesses?.length) {
      query = query.in("interesse", seg.interesses);
    }
    if (seg.dias_inativo) {
      const cutoff = new Date(now.getTime() - seg.dias_inativo * 24 * 60 * 60 * 1000).toISOString();
      query = query.lt("ultima_interacao_at", cutoff);
    }

    const { data: leads } = await query.limit(200);

    const template = campaign.message_templates;
    let enviados = 0;

    for (const lead of leads ?? []) {
      const conteudo = String(template.conteudo).replace("{{nome}}", lead.nome);
      const conv = Array.isArray(lead.conversations) ? lead.conversations[0] : lead.conversations;

      try {
        await sendTextMessage({
          phone: (lead as { telefone: string }).telefone,
          text: conteudo,
        });

        await db.from("activities").insert({
          lead_id:  lead.id,
          tipo:     "campanha",
          descricao: `Incluída na campanha: ${campaign.nome}`,
          meta:     { campaign_id: campaign.id },
        });
        enviados++;
      } catch (err) {
        console.error("[cron:campaigns] send error:", err);
      }
    }

    await db.from("campaigns").update({
      status: "concluida",
      total_alvos:   leads?.length ?? 0,
      total_enviados: enviados,
    }).eq("id", campaign.id);

    totalProcessed += enviados;
  }

  return NextResponse.json({ ok: true, processed: totalProcessed });
}
