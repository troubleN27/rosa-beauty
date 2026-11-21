import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BookingCard } from "@/components/bookings/booking-card";
import { PageHeader } from "@/components/layout/page-header";
import { getBookingDetails } from "@/lib/data/bookings";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Запись" };

export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const details = await getBookingDetails(id);
  if (!details) notFound();

  return (
    <>
      <Link href="/bookings" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        Все записи
      </Link>
      <PageHeader title="Запись" />
      <BookingCard details={details} />
    </>
  );
}
