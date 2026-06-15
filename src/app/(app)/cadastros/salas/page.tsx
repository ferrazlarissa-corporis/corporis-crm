import { getSalas, getSalaStats } from "@/lib/queries/salas";
import { SalasClient } from "./salas-client";

export const metadata = { title: "Salas · Corporis" };

export default async function SalasPage() {
  const salas = await getSalas();
  const stats = getSalaStats(salas);
  return <SalasClient salas={salas} stats={stats} />;
}
