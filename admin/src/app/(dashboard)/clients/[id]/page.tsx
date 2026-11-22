import { ChevronLeft, Phone, Send, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SOURCE_LABELS, type BookingSource } from "@/lib/constants";
import { getClientDetail } from "@/lib/data/clients";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDateTime, formatDay, formatPrice } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Клиент" };

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [settings, detail] = await Promise.all([getSalonSettings(), getClientDetail(id)]);
  if (!detail) notFound();
  const { client, history } = detail;
  const tz = settings.timezone;
  const count = (status: string) => history.filter((b) => b.status === status).length;

  const facts: [string, React.ReactNode][] = [
    ["Визиты", count("completed")],
    ["Отмены", count("cancelled")],
    ["Неявки", count("no_show")],
    ["Язык бота", client.language === "en" ? "English" : "Русский"],
    ["Клиент с", formatDay(client.createdAt, tz)],
  ];

  return (
    <>
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        Все клиенты
      </Link>
      <PageHeader
        title={client.name}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {client.phone && (
              <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="size-3.5" aria-hidden />
                {client.phone}
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Send className="size-3.5" aria-hidden />
              {client.telegramId !== null ? "Пишет через Telegram-бота" : "Без Telegram"}
            </span>
          </span>
        }
      />
      <dl className="mb-6 grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-5">
        {facts.map(([label, value]) => (
          <div key={label} className="border-b border-r p-4 sm:border-b-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 font-display text-xl font-semibold">История записей</h2>
        {history.length === 0 ? (
          <p className="empty-state px-4 py-10 text-center text-sm text-muted-foreground">Записей пока нет.</p>
        ) : (
          <ol data-stagger className="divide-y">
            {history.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/bookings/${booking.id}`}
                  className="grid gap-1 px-4 py-3 transition-colors hover:bg-accent/50 sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
                >
                  <span className="text-sm font-medium">{formatDateTime(booking.startsAt, tz)}</span>
                  <span className="min-w-0 text-sm">
                    <span className="block truncate">{booking.serviceName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {booking.masterName} · {formatPrice(booking.price, settings.currency)} ·{" "}
                      {SOURCE_LABELS[booking.source as BookingSource] ?? booking.source}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {booking.rating !== null && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground" aria-label={`Оценка ${booking.rating} из 5`}>
                        <Star className="size-3 fill-current text-primary" aria-hidden />
                        {booking.rating}
                      </span>
                    )}
                    <StatusBadge status={booking.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
