import { AppSidebar } from "@/components/corporis/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-[264px_1fr] bg-background text-text-primary">
      <AppSidebar />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
