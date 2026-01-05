import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Car } from "lucide-react";
import { formatDistance } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MaandViewProps {
  groupedByDate: Record<string, any[]>;
  stats: { totalDistance: number; totalTrips: number; privateKilometers?: number };
}

export function MaandView({ groupedByDate, stats }: MaandViewProps) {
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

  // Group by month
  const monthGroups: Record<string, { dates: Record<string, any[]>; year: number; month: number }> = {};

  Object.entries(groupedByDate).forEach(([date, items]) => {
    const d = new Date(date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = {
        dates: {},
        year: d.getFullYear(),
        month: d.getMonth(),
      };
    }

    monthGroups[monthKey].dates[date] = items;
  });

  const weekDays = ["ma", "di", "wo", "do", "vr", "za", "zo"];

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

      {/* Months */}
      {Object.entries(monthGroups)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([monthKey, monthData]) => {
          const firstDay = new Date(monthData.year, monthData.month, 1);
          const lastDay = new Date(monthData.year, monthData.month + 1, 0);
          const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0

          const monthDates = Object.values(monthData.dates).flat();
          const monthDistance = monthDates.reduce(
            (sum, item) => sum + (item.parsedData.distanceKm || 0),
            0
          );

          const daysInMonth = lastDay.getDate();
          const calendarDays: (number | null)[] = [];

          // Add empty cells for days before the first day of the month
          for (let i = 0; i < firstDayOfWeek; i++) {
            calendarDays.push(null);
          }

          // Add all days of the month
          for (let day = 1; day <= daysInMonth; day++) {
            calendarDays.push(day);
          }

          return (
            <Card key={monthKey}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {new Date(monthData.year, monthData.month).toLocaleDateString("nl-NL", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </CardTitle>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {monthDates.length} {monthDates.length === 1 ? "rit" : "ritten"} •{" "}
                    {formatDistance(monthDistance)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar grid */}
                <div className="space-y-2">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-muted-foreground p-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      if (day === null) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                      }

                      const dateStr = `${monthData.year}-${String(monthData.month + 1).padStart(
                        2,
                        "0"
                      )}-${String(day).padStart(2, "0")}`;
                      const dayTrips = monthData.dates[dateStr] || [];
                      const hasTrips = dayTrips.length > 0;
                      const dayDistance = dayTrips.reduce(
                        (sum, item) => sum + (item.parsedData.distanceKm || 0),
                        0
                      );

                      return (
                        <div
                          key={day}
                          className={cn(
                            "aspect-square rounded-md border p-1 text-center transition-colors",
                            hasTrips
                              ? "border-primary bg-primary/5 hover:bg-primary/10"
                              : "border-muted hover:bg-muted"
                          )}
                        >
                          <div className="text-xs font-medium mb-0.5">{day}</div>
                          {hasTrips && (
                            <>
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1 mb-0.5"
                              >
                                {dayTrips.length}
                              </Badge>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {Math.round(dayDistance)} km
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
