import { getPessoasParaVenda } from "@/lib/queries/pessoa";
import { getPlanos } from "@/lib/queries/planos";
import { getContratoModelos } from "@/lib/queries/contrato-modelos";
import { getAgendaOptions } from "@/lib/queries/agenda";
import { NovaVendaClient } from "./nova-venda-client";

export const metadata = { title: "Nova venda · Corporis" };

export default async function NovaVendaPage() {
  const [pessoas, planos, modelos, agendaOptions] = await Promise.all([
    getPessoasParaVenda(),
    getPlanos(),
    getContratoModelos(),
    getAgendaOptions(),
  ]);

  const planosAtivos = planos.filter((p) => p.ativo);
  const modelosAtivos = modelos
    .filter((m) => m.ativo)
    .map((m) => ({ id: m.id, nome: m.nome, pilares: m.pilares, planos: m.planos }));

  return (
    <NovaVendaClient
      pessoas={pessoas}
      planos={planosAtivos}
      modelos={modelosAtivos}
      agendaOptions={agendaOptions}
    />
  );
}
