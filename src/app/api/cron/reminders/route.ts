import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTemplate, sendTextMessage } from "@/lib/evolution/client";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const db = supabase.schema("crm");

  const now = new Date();
  const from23h = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const to25h   = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  const { data: appointments } = await db
    .from("appointments")
    .select("id, lead_id, inicio, tipo, leads!inner(nome, telefone)")
    .in("status", ["agendado", "confirmado"])
    .is("lembrete_enviado_at", null)
    .gte("inicio", from23h)
    .lte("inicio", to25h);

  let processed = 0;
  for (const appt of appointments ?? []) {
    const lead = Array.isArray(appt.leads) ? appt.leads[0] : appt.leads;
    if (!lead) continue;

    const dataHora = new Date(appt.inicio).toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    const texto = `Olá, ${(lead as { nome: string }).nome}! 👋 Lembrete da sua avaliação na Corporis: ${dataHora}. Nos vemos lá!`;

    try {
      // Try template first, fall back to text
      const phone = (lead as { telefone: string }).telefone;
      const janela = await db.from("conversations")
        .select("janela_24h_expira_at")
        .eq("lead_id", appt.lead_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const withinWindow = janela?.data?.janela_24h_expira_at &&
        new Date(janela.data.janela_24h_expira_at) > now;

      if (withinWindow) {
        await sendTextMessage({ phone, text: texto });
      } else {
        // Outside 24h window — only templates work
        // If no approved template, skip gracefully
        const { data: tmpl } = await db.from("message_templates")
          .select("whatsapp_template_name")
          .eq("categoria", "lembrete")
          .eq("aprovado_whatsapp", true)
          .limit(1)
          .maybeSingle();
        if (tmpl?.whatsapp_template_name) {
          await sendTemplate(phone, tmpl.whatsapp_template_name, []);
        } else {
          console.warn(`[cron:reminders] No approved template for lead ${appt.lead_id}`);
          continue;
        }
      }

      await db.from("appointments").update({ lembrete_enviado_at: now.toISOString() }).eq("id", appt.id);
      await db.from("activities").insert({
        lead_id:  appt.lead_id,
        tipo:     "sistema",
        descricao: "Lembrete de avaliação enviado automaticamente",
        meta:     { appointment_id: appt.id },
      });
      processed++;
    } catch (err) {
      console.error("[cron:reminders] send error:", err);
    }
  }

  return NextResponse.json({ ok: true, processed });
}
