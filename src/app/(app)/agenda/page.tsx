import { getWeekAppointments } from "@/lib/queries/appointments";
import AgendaClient from "./agenda-client";
import { startOfWeek } from "date-fns";

export default async function AgendaPage() {
  const now       = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const appointments = await getWeekAppointments(0);

  // 0 = Monday ... 5 = Saturday; Sunday (0 in JS) maps to -1 (hide indicator)
  const jsDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const todayIdx = jsDay === 0 ? -1 : jsDay - 1; // Mon=0, Sat=5, Sun=-1

  return (
    <AgendaClient
      initialEvents={appointments}
      weekStart={weekStart}
      todayIdx={todayIdx}
      nowH={now.getHours()}
      nowM={now.getMinutes()}
    />
  );
}
