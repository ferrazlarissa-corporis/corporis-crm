import { getLeadsForFunil } from "@/lib/queries/leads";
import { getClinicHours } from "@/lib/queries/clinic-config";
import FunilBoard from "./funil-board";

export default async function FunilPage() {
  const [leads, clinicHours] = await Promise.all([
    getLeadsForFunil(),
    getClinicHours(),
  ]);

  return <FunilBoard initialLeads={leads} clinicHours={clinicHours} />;
}
