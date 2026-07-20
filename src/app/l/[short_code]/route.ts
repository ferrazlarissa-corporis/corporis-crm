import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CLINIC_CONFIG_ID } from "@/lib/clinic-config";
import { normalizeBrazilPhone } from "@/lib/phone";

const FALLBACK_WHATSAPP_DIGITS = "5549991831900";

function whatsappRedirectUrl(digits: string, mensagem: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ short_code: string }> }) {
  const { short_code } = await params;
  const parsed = z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9]+$/)
    .safeParse(short_code);

  const genericUrl = whatsappRedirectUrl(FALLBACK_WHATSAPP_DIGITS, "Olá! Vi um post da Corporis e quero saber mais sobre agendar uma avaliação.");
  if (!parsed.success) {
    return NextResponse.redirect(genericUrl);
  }

  const supabase = createServiceRoleClient();

  const { data: link } = await supabase
    .schema("conteudo")
    .from("cta_lead")
    .select("id, cliques, post:post_id(titulo, pilar_id)")
    .eq("short_code", parsed.data)
    .maybeSingle();

  if (!link) {
    return NextResponse.redirect(genericUrl);
  }

  await supabase
    .schema("conteudo")
    .from("cta_lead")
    .update({ cliques: link.cliques + 1 })
    .eq("id", link.id);

  const pilarId = (link.post as unknown as { pilar_id: string | null } | null)?.pilar_id ?? null;
  const { data: pilar } = pilarId
    ? await supabase.schema("conteudo").from("pilar_editorial").select("nome").eq("id", pilarId).maybeSingle()
    : { data: null };

  const { data: clinicConfig } = await supabase.schema("crm").from("clinic_config").select("telefone").eq("id", CLINIC_CONFIG_ID).maybeSingle();
  const normalized = normalizeBrazilPhone(clinicConfig?.telefone);
  const digits = normalized.ok ? normalized.e164.replace(/^\+/, "") : FALLBACK_WHATSAPP_DIGITS;

  const mensagem = pilar?.nome
    ? `Olá! Vi um post da Corporis sobre ${pilar.nome.toLowerCase()} e quero saber mais sobre agendar uma avaliação.`
    : "Olá! Vi um post da Corporis e quero saber mais sobre agendar uma avaliação.";

  return NextResponse.redirect(whatsappRedirectUrl(digits, mensagem));
}
