"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Car, MapPin, ArrowRight } from "lucide-react";
import { formatDistance } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

interface DagViewProps {
  groupedByDate: Record<string, any[]>;
  stats: { totalDistance: number; totalTrips: number; privateKilometers?: number };
}

export function DagView({ groupedByDate, stats }: DagViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

      {/* Days with trips */}
      {Object.entries(groupedByDate)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, items]) => {
          const dayDistance = items.reduce(
            (sum, item) => sum + (item.parsedData.distanceKm || 0),
            0
          );

          return (
            <Card key={date}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
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
                      {formatDistance(dayDistance)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((registration: any) => {
                    const data = registration.parsedData;
                    return (
                      <div
                        key={registration.id}
                        className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-muted-foreground">
                              {new Date(data.timestamp).toLocaleTimeString("nl-NL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {registration.vehicle.licensePlate}
                            </Badge>
                          </div>

                          {/* Mobile: Stacked route */}
                          <div className="flex flex-col gap-1 text-sm lg:hidden">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate text-muted-foreground text-xs">Van:</span>
                              <span className="flex-1 truncate font-medium">
                                {data.departure?.text || "Onbekend"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate text-muted-foreground text-xs">Naar:</span>
                              <span className="flex-1 truncate font-medium">
                                {data.destination?.text || "Onbekend"}
                              </span>
                            </div>
                          </div>

                          {/* Desktop: Horizontal route */}
                          <div className="hidden lg:flex items-center gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 truncate">
                              {data.departure?.text || "Onbekend"}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 truncate">
                              {data.destination?.text || "Onbekend"}
                            </span>
                          </div>

                          {data.description && (
                            <p className="text-sm text-muted-foreground">{data.description}</p>
                          )}
                        </div>

                        <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start lg:text-right gap-2 pt-2 lg:pt-0 border-t lg:border-t-0">
                          <div className="text-sm font-semibold">
                            {data.distanceKm ? formatDistance(data.distanceKm) : "-"}
                          </div>
                          {data.startOdometerKm != null && data.endOdometerKm != null ? (
                            <div className="text-xs text-muted-foreground">
                              {data.startOdometerKm.toLocaleString("nl-NL")} → {data.endOdometerKm.toLocaleString("nl-NL")} km
                            </div>
                          ) : data.endOdometerKm != null ? (
                            <div className="text-xs text-muted-foreground">
                              {data.endOdometerKm.toLocaleString("nl-NL")} km
                            </div>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                const params = new URLSearchParams(searchParams);
                                params.set('complete', registration.id);
                                router.push(`/registraties/overzicht?${params.toString()}`);
                              }}
                            >
                              Incompleet
                            </Badge>
                          )}
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
