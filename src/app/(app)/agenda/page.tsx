import { endOfWeek, startOfWeek } from "date-fns";
import { getAgendaCompleta, getAgendaOptions } from "@/lib/queries/agenda";
import { getClinicHours } from "@/lib/queries/clinic-config";
import AgendaClient from "./agenda-client";

export const metadata = { title: "Agenda · Corporis" };

export default async function AgendaPage() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [events, clinicHours, options] = await Promise.all([
    getAgendaCompleta(weekStart, weekEnd),
    getClinicHours(),
    getAgendaOptions(),
  ]);

  return (
    <AgendaClient
      initialEvents={events}
      options={options}
      nowIso={now.toISOString()}
      clinicHours={clinicHours}
      initialRangeStart={weekStart.toISOString()}
      initialRangeEnd={weekEnd.toISOString()}
    />
  );
}
