import { getLeadsForFunil } from "@/lib/queries/leads";
import FunilBoard from "./funil-board";

export default async function FunilPage() {
  const leads = await getLeadsForFunil();
  return <FunilBoard initialLeads={leads} />;
}
