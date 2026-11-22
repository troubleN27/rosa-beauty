import { BrandMark } from "@/components/brand";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getI18n } from "@/i18n/server";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const { t } = await getI18n();

  return (
    <SidebarProvider>
      <AppSidebar userName={session.user.email} />
      <SidebarInset className="min-w-0 bg-background">
        <header className="velvet sticky top-0 z-20 flex h-14 items-center gap-3 px-4 text-sidebar-accent-foreground md:hidden">
          <SidebarTrigger aria-label={t("nav.openMenu")} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
          <BrandMark compact className="[&_img]:h-7 [&_span>span:first-child]:text-xl" />
        </header>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
