import { getServicos, getServicoStats } from "@/lib/queries/servicos";
import { ServicosClient } from "./servicos-client";

export const metadata = { title: "Serviços · Corporis" };

export default async function ServicosPage() {
  const servicos = await getServicos();
  const stats = await getServicoStats(servicos);

  return <ServicosClient servicos={servicos} stats={stats} />;
}
