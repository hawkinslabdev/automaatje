import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, MapPin, ArrowRight, Clock } from "lucide-react";
import { formatDistance } from "@/lib/utils";
import { TripCard } from "@/components/registrations/trip-card";

interface LijstViewProps {
  flatList: any[];
  stats: { totalDistance: number; totalTrips: number; privateKilometers?: number };
}

export function LijstView({ flatList, stats }: LijstViewProps) {
  const hasRegistrations = flatList.length > 0;

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

  // Sort by timestamp descending (newest first)
  const sortedList = [...flatList].sort(
    (a, b) => b.parsedData.timestamp - a.parsedData.timestamp
  );

  return (
    <div className="space-y-4">
      {/* Period Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm lg:text-base">Totaal overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Ritten</p>
              <p className="text-xl lg:text-2xl font-bold">{stats.totalTrips}</p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Afstand</p>
              <p className="text-xl lg:text-2xl font-bold">{formatDistance(stats.totalDistance)}</p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Privé</p>
              <p className="text-xl lg:text-2xl font-bold">{formatDistance(stats.privateKilometers || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List of all trips - Mobile: Cards, Desktop: List */}
      <div>
        <h2 className="text-base font-semibold mb-3 lg:hidden">Alle ritten</h2>

        {/* Mobile/Tablet: Card Layout */}
        <div className="space-y-3 lg:hidden">
          {sortedList.map((registration: any) => (
            <TripCard
              key={registration.id}
              trip={{
                id: registration.id,
                timestamp: registration.parsedData.timestamp,
                data: registration.parsedData,
                vehicle: registration.vehicle,
              }}
            />
          ))}
        </div>

        {/* Desktop: Original List Layout */}
        <Card className="hidden lg:block">
          <CardHeader>
            <CardTitle className="text-base">Alle ritten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedList.map((registration: any) => {
                const data = registration.parsedData;
                const tripDate = new Date(data.timestamp);

                return (
                  <div
                    key={registration.id}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      {/* Date and time */}
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">
                          {tripDate.toLocaleDateString("nl-NL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          {tripDate.toLocaleTimeString("nl-NL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {registration.vehicle.licensePlate}
                        </Badge>
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 truncate">{data.departure?.text || "Onbekend"}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 truncate">
                          {data.destination?.text || "Onbekend"}
                        </span>
                      </div>

                      {/* Description if available */}
                      {data.description && (
                        <p className="text-sm text-muted-foreground pl-5">{data.description}</p>
                      )}
                    </div>

                    {/* Distance and odometer */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">
                        {data.distanceKm ? formatDistance(data.distanceKm) : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.startOdometerKm != null && data.endOdometerKm != null
                          ? `${data.startOdometerKm.toLocaleString("nl-NL")} → ${data.endOdometerKm.toLocaleString("nl-NL")} km`
                          : (data.endOdometerKm || data.startOdometerKm)?.toLocaleString("nl-NL") + " km" || "-"}
                      </div>
                      {data.tripType && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {data.tripType === "business" ? "Zakelijk" : "Privé"}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
