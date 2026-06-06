import { CLINIC_CONFIG_ID, normalizeClinicHours } from "@/lib/clinic-config";
import { createClient } from "@/lib/supabase/server";

export async function getClinicHours() {
  const supabase = await createClient();

  const { data } = await supabase
    .schema("crm")
    .from("clinic_config")
    .select("funcionamento")
    .eq("id", CLINIC_CONFIG_ID)
    .maybeSingle();

  return normalizeClinicHours(data?.funcionamento);
}
