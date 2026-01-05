"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Car, Calendar, TrendingUp } from "lucide-react";
import { formatDistance } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface PeriodTabsProps {
  defaultPeriod?: "recent" | "week" | "month" | "year";
  periods: {
    recent: {
      groupedByDate: Record<string, any[]>;
      stats: { totalDistance: number; totalTrips: number };
    };
    week: {
      groupedByDate: Record<string, any[]>;
      stats: { totalDistance: number; totalTrips: number };
    };
    month: {
      groupedByDate: Record<string, any[]>;
      stats: { totalDistance: number; totalTrips: number };
    };
    year: {
      groupedByDate: Record<string, any[]>;
      stats: { totalDistance: number; totalTrips: number };
    };
  };
}

export function PeriodTabs({ defaultPeriod = "recent", periods }: PeriodTabsProps) {
  const router = useRouter();

  const handleTabChange = (value: string) => {
    const period = value as "recent" | "week" | "month" | "year";
    router.push(`/registraties/overzicht?period=${period}`);
  };

  const renderPeriodContent = (
    groupedByDate: Record<string, any[]>,
    stats: { totalDistance: number; totalTrips: number }
  ) => {
    const hasRegistrations = Object.keys(groupedByDate).length > 0;

    if (!hasRegistrations) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Car className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Geen ritten in deze periode</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Er zijn geen ritten geregistreerd in de geselecteerde periode.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Period Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overzicht
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Totaal ritten</p>
                <p className="text-2xl font-bold">{stats.totalTrips}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totaal afstand</p>
                <p className="text-2xl font-bold">{formatDistance(stats.totalDistance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trips by Date */}
        {Object.entries(groupedByDate).map(([date, items]) => (
          <Card key={date}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(date).toLocaleDateString("nl-NL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </CardTitle>
                  <CardDescription>
                    {items.length} {items.length === 1 ? "rit" : "ritten"} •{" "}
                    {formatDistance(
                      items.reduce((sum, item) => {
                        const data = item.parsedData;
                        return sum + (data.distanceKm || 0);
                      }, 0)
                    )}{" "}
                    totaal
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Bestemming</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Voertuig</TableHead>
                    <TableHead className="text-right">Afstand</TableHead>
                    <TableHead className="text-right">Kilometerstand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((registration: any) => {
                    const data = registration.parsedData;
                    return (
                      <TableRow key={registration.id}>
                        <TableCell className="font-medium">
                          {new Date(data.timestamp).toLocaleTimeString("nl-NL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>{data.destination?.text || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {data.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{registration.vehicle.licensePlate}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {data.distanceKm ? formatDistance(data.distanceKm) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(data.endOdometerKm || data.startOdometerKm)?.toLocaleString("nl-NL")} km
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Tabs value={defaultPeriod} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-4">
        <TabsTrigger value="recent">Recent</TabsTrigger>
        <TabsTrigger value="week">Week</TabsTrigger>
        <TabsTrigger value="month">Maand</TabsTrigger>
        <TabsTrigger value="year">Jaar</TabsTrigger>
      </TabsList>

      <TabsContent value="recent" className="mt-6">
        {renderPeriodContent(periods.recent.groupedByDate, periods.recent.stats)}
      </TabsContent>

      <TabsContent value="week" className="mt-6">
        {renderPeriodContent(periods.week.groupedByDate, periods.week.stats)}
      </TabsContent>

      <TabsContent value="month" className="mt-6">
        {renderPeriodContent(periods.month.groupedByDate, periods.month.stats)}
      </TabsContent>

      <TabsContent value="year" className="mt-6">
        {renderPeriodContent(periods.year.groupedByDate, periods.year.stats)}
      </TabsContent>
    </Tabs>
  );
}
