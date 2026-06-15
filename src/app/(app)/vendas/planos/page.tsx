import { getPlanos, getPlanoStats, getServicoOptions } from "@/lib/queries/planos";
import { PlanosClient } from "./planos-client";

export const metadata = { title: "Planos · Corporis" };

export default async function PlanosPage() {
  const [planos, servicos] = await Promise.all([getPlanos(), getServicoOptions()]);
  const stats = getPlanoStats(planos);
  return <PlanosClient planos={planos} servicos={servicos} stats={stats} />;
}
