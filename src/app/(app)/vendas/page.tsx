import { getMatriculas, getMatriculaStats } from "@/lib/queries/matriculas";
import { VendasClient } from "./vendas-client";

export const metadata = { title: "Vendas · Corporis" };

export default async function VendasPage() {
  const matriculas = await getMatriculas();
  const stats = getMatriculaStats(matriculas);
  return <VendasClient matriculas={matriculas} stats={stats} />;
}
