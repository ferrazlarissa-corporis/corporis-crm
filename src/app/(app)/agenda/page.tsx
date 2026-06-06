import { getAppointmentsBetween } from "@/lib/queries/appointments";
import { getClinicHours } from "@/lib/queries/clinic-config";
import AgendaClient from "./agenda-client";
import { endOfWeek, startOfWeek } from "date-fns";

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
