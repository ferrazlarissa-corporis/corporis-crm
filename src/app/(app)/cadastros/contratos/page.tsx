import {
  getContratoModelos,
  getContratoModeloStats,
  getPlanoOptions,
} from "@/lib/queries/contrato-modelos";
import { ContratosClient } from "./contratos-client";

export const metadata = { title: "Modelos de contrato · Corporis" };

export default async function ContratosPage() {
  const [modelos, planos] = await Promise.all([getContratoModelos(), getPlanoOptions()]);
  const stats = getContratoModeloStats(modelos);
  return <ContratosClient modelos={modelos} planos={planos} stats={stats} />;
}
