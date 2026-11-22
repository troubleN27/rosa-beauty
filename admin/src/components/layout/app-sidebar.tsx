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
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

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
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useI18n } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";

const NAV = [
  { href: "/", label: "nav.home" as const, icon: LayoutDashboard },
  { href: "/schedule", label: "nav.schedule" as const, icon: CalendarDays },
  { href: "/bookings", label: "nav.bookings" as const, icon: ClipboardList },
  { href: "/services", label: "nav.services" as const, icon: Scissors },
  { href: "/masters", label: "nav.masters" as const, icon: UserRound },
  { href: "/clients", label: "nav.clients" as const, icon: Users },
  { href: "/reviews", label: "nav.reviews" as const, icon: MessageSquareHeart },
  { href: "/settings", label: "nav.settings" as const, icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { t } = useI18n();
  const menuRef = useRef<HTMLUListElement>(null);
  const activeIndex = NAV.findIndex((item) => isActive(pathname, item.href));

  // The velvet highlight with the rose glides to the chosen section.
  useGSAP(
    () => {
      const menu = menuRef.current;
      const marker = menu?.querySelector<HTMLElement>("[data-nav-marker]");
      const rose = marker?.querySelector<HTMLElement>("[data-nav-rose]");
      const item = menu?.querySelector<HTMLElement>(`[data-nav-index="${activeIndex}"]`);
      if (!marker || !rose) return;
      if (!item) {
        gsap.to(marker, { autoAlpha: 0, duration: 0.25 });
        return;
      }
      const target = { y: item.offsetTop, height: item.offsetHeight };
      if (marker.dataset.placed !== "true") {
        gsap.set(marker, { ...target, autoAlpha: 1 });
        marker.dataset.placed = "true";
      } else {
        gsap.to(marker, { ...target, autoAlpha: 1, duration: 0.55, ease: "power3.inOut" });
      }
      gsap.fromTo(
        rose,
        { rotate: -35, scale: 0.4, autoAlpha: 0 },
        { rotate: 0, scale: 1, autoAlpha: 1, duration: 0.7, delay: 0.25, ease: "back.out(2.2)" },
      );
    },
    { dependencies: [activeIndex], scope: menuRef },
  );

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
              <SidebarMenu ref={menuRef} className="relative gap-1">
                <li
                  aria-hidden
                  data-nav-marker
                  className="pointer-events-none invisible absolute inset-x-0 top-0 flex items-center justify-end rounded-md bg-sidebar-accent pr-2 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sidebar-primary)_30%,transparent)]"
                >
                  <Image
                    data-nav-rose
                    src="/brand/rose.png"
                    alt=""
                    width={167}
                    height={240}
                    className="h-6 w-auto drop-shadow-[0_0_6px_rgb(216_170_98/0.55)]"
                  />
                </li>
                {NAV.map((item, index) => (
                  <SidebarMenuItem key={item.href} data-nav-index={index} className="z-10">
                    <SidebarMenuButton
                      isActive={isActive(pathname, item.href)}
                      render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                      className="h-9 gap-3 px-3 text-sidebar-foreground/80 transition-colors duration-300 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground data-active:bg-transparent data-active:text-sidebar-primary data-active:hover:bg-transparent"
                    >
                      <item.icon aria-hidden />
                      <span>{t(item.label)}</span>
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
              <LanguageToggle />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} className="text-sidebar-foreground/80">
                <LogOut aria-hidden />
                <span>{t("nav.signOut")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
