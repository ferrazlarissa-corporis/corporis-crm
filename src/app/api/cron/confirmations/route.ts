import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTextMessage } from "@/lib/evolution/client";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const db = supabase.schema("crm");
  const now = new Date();

  const from2h30 = new Date(now.getTime() + 2.5 * 60 * 60 * 1000).toISOString();
  const to3h30   = new Date(now.getTime() + 3.5 * 60 * 60 * 1000).toISOString();

  const { data: appointments } = await db
    .from("appointments")
    .select("id, lead_id, inicio, tipo, leads!inner(nome, telefone)")
    .eq("status", "agendado")
    .is("confirmacao_enviada_at", null)
    .gte("inicio", from2h30)
    .lte("inicio", to3h30);

  let processed = 0;
  for (const appt of appointments ?? []) {
    const lead = Array.isArray(appt.leads) ? appt.leads[0] : appt.leads;
    if (!lead) continue;

    const hora = new Date(appt.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const texto = `${(lead as { nome: string }).nome}, sua avaliação na Corporis é hoje às ${hora}! Responda OK para confirmar presença. 😊`;

    try {
      await sendTextMessage({ phone: (lead as { telefone: string }).telefone, text: texto });
      await db.from("appointments").update({ confirmacao_enviada_at: now.toISOString() }).eq("id", appt.id);
      await db.from("activities").insert({
        lead_id:  appt.lead_id,
        tipo:     "sistema",
        descricao: "Solicitação de confirmação enviada automaticamente",
        meta:     { appointment_id: appt.id },
      });
      processed++;
    } catch (err) {
      console.error("[cron:confirmations] send error:", err);
    }
  }

  return NextResponse.json({ ok: true, processed });
}
