"use client";

import { tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { T } from "@/i18n/client";

export type BookingTableRow = {
  id: string;
  date: string;
  time: string;
  client: string;
  phone: string | null;
  service: string;
  master: string;
  price: string;
  status: string;
  source: string;
};

const features = tableFeatures({});

function SortHeader({ label, field }: { label: React.ReactNode; field: "starts" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") ?? "starts_desc";
  const next = sort === "starts_desc" ? "starts_asc" : "starts_desc";
  const Icon = sort === `${field}_asc` ? ArrowUp : sort === `${field}_desc` ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", next);
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      {label}
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}

const columns: ColumnDef<typeof features, BookingTableRow>[] = [
  {
    id: "when",
    header: () => <SortHeader label={<T k="bookings.table.when" />} field="starts" />,
    cell: ({ row }) => (
      <Link href={`/bookings/${row.original.id}`} className="block whitespace-nowrap hover:text-primary">
        <span className="block font-display text-xl leading-none font-semibold tabular-nums">{row.original.time}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{row.original.date}</span>
      </Link>
    ),
  },
  {
    id: "client",
    header: () => <T k="bookings.table.client" />,
    cell: ({ row }) => (
      <div className="min-w-32">
        <p className="truncate">{row.original.client}</p>
        {row.original.phone && <p className="truncate text-xs text-muted-foreground">{row.original.phone}</p>}
      </div>
    ),
  },
  { id: "service", header: () => <T k="bookings.table.service" />, cell: ({ row }) => (
      <span className="block min-w-36 whitespace-normal">{row.original.service}</span>
    ),
  },
  { id: "master", header: () => <T k="bookings.table.master" />, cell: ({ row }) => <span className="whitespace-nowrap">{row.original.master}</span> },
  { id: "price", header: () => <T k="bookings.table.price" />, cell: ({ row }) => <span className="font-display text-lg tabular-nums">{row.original.price}</span> },
  { id: "status", header: () => <T k="bookings.table.status" />, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "source", header: () => <T k="bookings.table.source" />, cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.source}</span> },
];

export function BookingsTable({ data }: { data: BookingTableRow[] }) {
  const table = useTable({ features, columns, data });

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => (
                <TableHead key={header.id} className="text-xs font-medium text-muted-foreground">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id} className="py-2.5">
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
