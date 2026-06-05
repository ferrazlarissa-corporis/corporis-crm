import { getAppointmentsBetween } from "@/lib/queries/appointments";
import { CLINIC_CONFIG_ID, normalizeClinicHours } from "@/lib/clinic-config";
import { createClient } from "@/lib/supabase/server";
import AgendaClient from "./agenda-client";
import { endOfWeek, startOfWeek } from "date-fns";

async function getClinicHours() {
  const supabase = await createClient();

  const { data } = await supabase
    .schema("crm")
    .from("clinic_config")
    .select("funcionamento")
    .eq("id", CLINIC_CONFIG_ID)
    .maybeSingle();

  return normalizeClinicHours(data?.funcionamento);
}

export default async function AgendaPage() {
  const now       = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const [appointments, clinicHours] = await Promise.all([
    getAppointmentsBetween(weekStart, weekEnd),
    getClinicHours(),
  ]);

  return (
    <AgendaClient
      initialEvents={appointments}
      nowIso={now.toISOString()}
      nowH={now.getHours()}
      nowM={now.getMinutes()}
      clinicHours={clinicHours}
      initialRangeStart={weekStart.toISOString()}
      initialRangeEnd={weekEnd.toISOString()}
    />
  );
}
