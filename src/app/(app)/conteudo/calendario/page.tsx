import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { CalendarioBoard } from "./calendario-board";

export const metadata = { title: "Calendário · Corporis Conteúdo" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.ano ? Number(params.ano) : now.getFullYear();
  const month = params.mes ? Number(params.mes) - 1 : now.getMonth();
  const anchor = new Date(year, month, 1);

  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });

  const supabase = await createClient();

  const [{ data: slots }, { data: pilares }] = await Promise.all([
    supabase
      .schema("conteudo")
      .from("slot_calendario")
      .select("id, data, horario, pilar_sugerido, post_id, status, post:post_id(titulo)")
      .gte("data", format(gridStart, "yyyy-MM-dd"))
      .lte("data", format(gridEnd, "yyyy-MM-dd"))
      .order("data"),
    supabase.schema("conteudo").from("pilar_editorial").select("id, nome, cor_token, ativo").order("nome"),
  ]);

  return (
    <CalendarioBoard
      year={year}
      month={month}
      monthLabel={format(anchor, "MMMM yyyy", { locale: ptBR })}
      gridStartIso={format(gridStart, "yyyy-MM-dd")}
      gridEndIso={format(gridEnd, "yyyy-MM-dd")}
      initialSlots={(slots ?? []).map((s) => ({
        id: s.id,
        data: s.data,
        horario: s.horario,
        pilar_sugerido: s.pilar_sugerido,
        post_id: s.post_id,
        status: s.status,
        post_titulo: (s.post as unknown as { titulo: string } | null)?.titulo ?? null,
      }))}
      pilares={pilares ?? []}
    />
  );
}
