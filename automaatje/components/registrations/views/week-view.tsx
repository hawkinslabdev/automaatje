import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Car } from "lucide-react";
import { formatDistance } from "@/lib/utils";

interface WeekViewProps {
  groupedByDate: Record<string, any[]>;
  stats: { totalDistance: number; totalTrips: number; privateKilometers?: number };
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function WeekView({ groupedByDate, stats }: WeekViewProps) {
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

  // Group by week
  const weekGroups: Record<string, { dates: Record<string, any[]>; weekStart: Date }> = {};

  Object.entries(groupedByDate).forEach(([date, items]) => {
    const d = new Date(date);
    const monday = getMonday(d);
    const weekKey = `${monday.getFullYear()}-W${getWeekNumber(monday)}`;

    if (!weekGroups[weekKey]) {
      weekGroups[weekKey] = {
        dates: {},
        weekStart: monday,
      };
    }

    weekGroups[weekKey].dates[date] = items;
  });

  return (
    <div className="space-y-4">
      {/* Period Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm lg:text-base">Totaal overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <div className="hidden lg:block">
              <p className="text-sm text-muted-foreground">Ritten</p>
              <p className="text-xl lg:text-2xl font-bold">{stats.totalTrips}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Afstand</p>
              <p className="text-xl lg:text-2xl font-bold">{formatDistance(stats.totalDistance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Privé</p>
              <p className="text-xl lg:text-2xl font-bold">{formatDistance(stats.privateKilometers || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weeks */}
      {Object.entries(weekGroups)
        .sort(([, a], [, b]) => b.weekStart.getTime() - a.weekStart.getTime())
        .map(([weekKey, weekData]) => {
          const weekDates = Object.values(weekData.dates).flat();
          const weekDistance = weekDates.reduce(
            (sum, item) => sum + (item.parsedData.distanceKm || 0),
            0
          );
          const weekTrips = weekDates.length;

          const weekEnd = new Date(weekData.weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          return (
            <Card key={weekKey}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    Week {getWeekNumber(weekData.weekStart)} •{" "}
                    {weekData.weekStart.toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    -{" "}
                    {weekEnd.toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </CardTitle>
                <CardDescription>
                  {weekTrips} {weekTrips === 1 ? "rit" : "ritten"} •{" "}
                  {formatDistance(weekDistance)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(weekData.dates)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, items]) => {
                      const dayDistance = items.reduce(
                        (sum, item) => sum + (item.parsedData.distanceKm || 0),
                        0
                      );

                      return (
                        <div
                          key={date}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="text-sm font-medium sm:min-w-[120px]">
                              {new Date(date).toLocaleDateString("nl-NL", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {items.slice(0, 3).map((reg: any) => (
                                <Badge
                                  key={reg.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {reg.vehicle.licensePlate}
                                </Badge>
                              ))}
                              {items.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{items.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start text-right gap-2 sm:gap-0">
                            <div className="text-sm font-semibold">
                              {formatDistance(dayDistance)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {items.length} {items.length === 1 ? "rit" : "ritten"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
