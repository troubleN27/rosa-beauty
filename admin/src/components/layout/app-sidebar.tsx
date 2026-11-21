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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 pt-5 pb-3">
        <Link href="/" className="flex items-baseline gap-2" onClick={() => setOpenMobile(false)}>
          <span className="text-[17px] font-semibold tracking-tight">Rosa Beauty</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, item.href)}
                    render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                    className="data-active:bg-sidebar-accent data-active:font-medium data-active:text-primary"
                  >
                    <item.icon aria-hidden />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        <p className="truncate px-2 text-xs text-muted-foreground" title={userName}>
          {userName}
        </p>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut aria-hidden />
              <span>Выйти</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
