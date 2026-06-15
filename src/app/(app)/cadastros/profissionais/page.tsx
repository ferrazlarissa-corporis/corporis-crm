import { getProfissionais, getProfissionalStats } from "@/lib/queries/profissionais";
import { ProfissionaisClient } from "./profissionais-client";

export const metadata = { title: "Profissionais · Corporis" };

export default async function ProfissionaisPage() {
  const profissionais = await getProfissionais();
  const stats = getProfissionalStats(profissionais);
  return <ProfissionaisClient profissionais={profissionais} stats={stats} />;
}
