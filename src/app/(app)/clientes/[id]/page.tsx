import { notFound } from "next/navigation";
import { getFichaCliente } from "@/lib/queries/ficha-cliente";
import { getContratoModelos } from "@/lib/queries/contrato-modelos";
import { FichaClienteClient } from "./ficha-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await getFichaCliente(id);
  return { title: ficha ? `${ficha.pessoa.nome} · Corporis` : "Cliente · Corporis" };
}

export default async function FichaClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const [ficha, modelos] = await Promise.all([getFichaCliente(id), getContratoModelos()]);
  if (!ficha) notFound();

  const modelosAtivos = modelos.filter((m) => m.ativo).map((m) => ({ id: m.id, nome: m.nome }));
  return <FichaClienteClient ficha={ficha} modelos={modelosAtivos} initialTab={tab === "plano" ? "plano" : "visao"} />;
}
