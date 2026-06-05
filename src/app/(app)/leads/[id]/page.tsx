import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/queries/leads";
import { getLeadActivities } from "@/lib/queries/activities";
import { getLeadAppointments } from "@/lib/queries/appointments";
import LeadClient from "./lead-client";

type Props = { params: Promise<{ id: string }> };

export default async function LeadPage({ params }: Props) {
  const { id } = await params;

  const [lead, activities, appointments] = await Promise.all([
    getLeadById(id),
    getLeadActivities(id),
    getLeadAppointments(id),
  ]);

  if (!lead) notFound();

  return <LeadClient lead={lead} activities={activities} appointments={appointments} />;
}
