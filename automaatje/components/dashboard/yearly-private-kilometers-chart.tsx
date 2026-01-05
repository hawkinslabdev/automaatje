"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";

interface YearlyPrivateKilometersChartProps {
  currentYearKm: number;
  previousYearKm: number;
  currentYear: string;
  previousYear: string;
  monthlyData: { month: string; kilometers: number }[];
}

const chartConfig = {
  kilometers: {
    label: "Privé kilometers",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function YearlyPrivateKilometersChart({
  currentYearKm,
  previousYearKm,
  currentYear,
  previousYear,
  monthlyData,
}: YearlyPrivateKilometersChartProps) {
  const hasPreviousYear = previousYearKm > 0;
  const trend = hasPreviousYear
    ? ((currentYearKm - previousYearKm) / previousYearKm) * 100
    : 0;
  const isTrendingUp = trend > 0;

  // For charts to render properly, we need at least 2 data points
  // If we only have 1, add a starting point at 0
  const chartData = monthlyData.length === 1
    ? [{ month: "", kilometers: 0 }, ...monthlyData]
    : monthlyData;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Privé kilometers dit jaar
        </CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent>
        <div className="text-xl lg:text-2xl font-bold">{Math.round(currentYearKm)} km</div>
        <p className="text-xs text-muted-foreground">
          {currentYearKm === 0 ? "Nog geen privé kilometers" : currentYear}
        </p>

        {monthlyData.length > 0 ? (
          <div className="mt-3 lg:mt-4 w-full overflow-hidden" style={{ height: '60px' }}>
            <ChartContainer config={chartConfig} className="w-full h-full">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <defs>
                  <linearGradient id="fillPrivateKilometers" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-kilometers)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-kilometers)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel indicator="line" />}
                />
                <Area
                  dataKey="kilometers"
                  type="natural"
                  fill="url(#fillPrivateKilometers)"
                  fillOpacity={0.4}
                  stroke="var(--color-kilometers)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="mt-4 h-[60px] flex items-center justify-center text-xs text-muted-foreground">
            Nog geen data dit jaar
          </div>
        )}

        {hasPreviousYear && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {isTrendingUp ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span>
              {Math.abs(Math.round(trend))}% vs {previousYear}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
