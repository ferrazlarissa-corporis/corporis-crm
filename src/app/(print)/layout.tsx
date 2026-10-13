import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <div className="min-h-dvh bg-background text-text-primary print:bg-transparent">{children}</div>;
}
