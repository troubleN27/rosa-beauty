import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSalonSettings } from "@/lib/data/settings";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  await requireSession();
  const s = await getSalonSettings();
  return (
    <>
      <PageHeader title="Настройки" description="Контакты салона и правила записи для бота." />
      <SettingsForm
        initial={{
          name: s.name,
          addressRu: s.addressRu ?? "",
          addressEn: s.addressEn ?? "",
          phone: s.phone ?? "",
          instagram: s.instagram ?? "",
          hoursRu: s.hoursRu ?? "",
          hoursEn: s.hoursEn ?? "",
          latitude: s.latitude ?? "",
          longitude: s.longitude ?? "",
          timezone: s.timezone,
          currency: s.currency as "USD" | "EUR" | "RUB",
          slotStepMin: s.slotStepMin,
          minLeadTimeMin: s.minLeadTimeMin,
          cancelDeadlineHours: s.cancelDeadlineHours,
          bookingHorizonDays: s.bookingHorizonDays,
          remindersEnabled: s.remindersEnabled,
          reviewsEnabled: s.reviewsEnabled,
        }}
      />
    </>
  );
}
