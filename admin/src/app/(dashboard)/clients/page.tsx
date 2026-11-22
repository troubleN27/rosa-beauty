import { Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/pagination";
import { SearchBox } from "@/components/search-box";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLIENTS_PAGE_SIZE, listClients } from "@/lib/data/clients";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDay } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("clients.title") };
}

const paramsSchema = z.object({
  q: z.string().max(64).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  await requireSession();
  const { t, lang } = await getI18n();
  const { q, page } = paramsSchema.parse(await searchParams);
  const [settings, { rows, total }] = await Promise.all([getSalonSettings(), listClients(q ?? "", page)]);
  const pages = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE));

  return (
    <>
      <PageHeader title={t("clients.title")} description={total ? t("clients.total", { count: total }) : undefined} />
      <SearchBox label={t("clients.search")} placeholder={t("clients.searchPlaceholder")} />
      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card empty-state px-4 py-12 text-center text-sm text-muted-foreground">
          {q ? t("clients.emptySearch") : t("clients.empty")}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {[t("clients.columns.client"), t("clients.columns.phone"), t("clients.columns.visits"), t("clients.columns.lastVisit"), t("clients.columns.cancels"), t("clients.columns.noShows")].map((head) => (
                  <TableHead key={head} className="text-xs text-muted-foreground">
                    {head}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="py-2.5">
                    <Link href={`/clients/${client.id}`} className="inline-flex min-w-36 items-center gap-1.5 font-medium hover:text-primary">
                      {client.name}
                      {client.telegramId !== null && <Send className="size-3 text-muted-foreground" aria-label="Telegram" />}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{client.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="tabular-nums">{client.visits}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {client.lastVisit ? formatDay(client.lastVisit, settings.timezone, lang) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">{client.cancelled}</TableCell>
                  <TableCell className={client.noShows ? "font-medium text-destructive tabular-nums" : "tabular-nums"}>
                    {client.noShows}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination basePath="/clients" params={{ q }} page={page} pages={pages} />
    </>
  );
}
