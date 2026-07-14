import { notFound } from "next/navigation";
import { getAgendaOptions } from "@/lib/queries/agenda";
import { getContratoModelos } from "@/lib/queries/contrato-modelos";
import { getPessoasParaVenda } from "@/lib/queries/pessoa";
import { getPlanos } from "@/lib/queries/planos";
import { NovaVendaClient } from "../../../vendas/nova/nova-venda-client";

export const metadata = { title: "Novo plano · Corporis" };

export default async function NovaVendaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pessoas, planos, modelos, agendaOptions] = await Promise.all([
    getPessoasParaVenda(),
    getPlanos(),
    getContratoModelos(),
    getAgendaOptions(),
  ]);

  if (!pessoas.some((pessoa) => pessoa.id === id)) notFound();

  const planosAtivos = planos.filter((plano) => plano.ativo);
  const modelosAtivos = modelos
    .filter((modelo) => modelo.ativo)
    .map((modelo) => ({
      id: modelo.id,
      nome: modelo.nome,
      pilares: modelo.pilares,
      planos: modelo.planos,
    }));

  return (
    <NovaVendaClient
      pessoas={pessoas}
      planos={planosAtivos}
      modelos={modelosAtivos}
      agendaOptions={agendaOptions}
      clienteContextId={id}
    />
  );
}
