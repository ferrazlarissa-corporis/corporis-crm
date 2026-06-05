import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/corporis/app-sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="grid min-h-dvh grid-cols-[264px_1fr] bg-background text-text-primary">
      <AppSidebar />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
