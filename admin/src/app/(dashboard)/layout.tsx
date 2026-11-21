import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  return (
    <SidebarProvider>
      <AppSidebar userName={session.user.email} />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <SidebarTrigger aria-label="Открыть меню" />
          <span className="font-semibold tracking-tight">Rosa Beauty</span>
        </header>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
