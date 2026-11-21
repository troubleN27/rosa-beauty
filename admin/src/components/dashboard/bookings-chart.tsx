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
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={1} fontSize={11} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} fontSize={11} />
        <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}
