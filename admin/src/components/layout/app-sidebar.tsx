"use client";

import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquareHeart,
  Scissors,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { authClient } from "@/lib/auth-client";

const NAV = [
  { href: "/", label: "Главная", icon: LayoutDashboard },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/bookings", label: "Записи", icon: ClipboardList },
  { href: "/services", label: "Услуги", icon: Scissors },
  { href: "/masters", label: "Мастера", icon: UserRound },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/reviews", label: "Отзывы", icon: MessageSquareHeart },
  { href: "/settings", label: "Настройки", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-sidebar-border!">
      <div className="velvet flex h-full min-h-0 flex-col">
        <SidebarHeader className="px-5 pt-6 pb-4">
          <Link href="/" className="rounded-md text-sidebar-accent-foreground" onClick={() => setOpenMobile(false)}>
            <BrandMark />
          </Link>
          <div className="mt-4 h-px bg-gradient-to-r from-sidebar-primary/50 via-sidebar-primary/15 to-transparent" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-3">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive(pathname, item.href)}
                      render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                      className="group/nav h-9 gap-3 px-3 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-primary data-active:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sidebar-primary)_30%,transparent)]"
                    >
                      <item.icon aria-hidden />
                      <span>{item.label}</span>
                      <span
                        aria-hidden
                        className="bulb-glow ml-auto hidden size-1.5 shrink-0 rounded-full bg-sidebar-primary group-data-active/nav:block"
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
          <p className="truncate px-3 text-xs text-sidebar-foreground/55" title={userName}>
            {userName}
          </p>
          <SidebarMenu>
            <SidebarMenuItem>
              <ThemeToggle />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} className="text-sidebar-foreground/80">
                <LogOut aria-hidden />
                <span>Выйти</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
