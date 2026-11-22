"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  count: { label: "Записей", color: "var(--primary)" },
} satisfies ChartConfig;

type Point = { day: string; label: string; count: number };

export function BookingsChart({ data }: { data: Point[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ left: -24, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={1} fontSize={11} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} fontSize={11} />
        <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent hideIndicator />} />
        <defs>
          <linearGradient id="bar-rose-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <Bar dataKey="count" fill="url(#bar-rose-gold)" radius={[14, 14, 2, 2]} maxBarSize={26} />
      </BarChart>
    </ChartContainer>
  );
}
