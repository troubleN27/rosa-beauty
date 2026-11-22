"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/client";
import { MASTER_TABS, type MasterTab } from "@/lib/constants";

export function MasterTabs({ tab }: { tab: MasterTab }) {
  const router = useRouter();
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <div className="mb-4 max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
      <Tabs value={tab} onValueChange={(value) => router.replace(`${pathname}?tab=${value}`, { scroll: false })}>
        <TabsList>
          {MASTER_TABS.map((item) => (
            <TabsTrigger key={item} value={item}>
              {t(`masters.tabs.${item}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
