"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { formatDistance } from "@/lib/utils";

interface TabelViewProps {
  flatList: any[];
  stats: { totalDistance: number; totalTrips: number; privateKilometers?: number };
}

type SortField = "date" | "vehicle" | "distance" | "odometer";
type SortDirection = "asc" | "desc";

export function TabelView({ flatList, stats }: TabelViewProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  // Sort the data
  const sortedList = [...flatList].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "date":
        comparison = a.parsedData.timestamp - b.parsedData.timestamp;
        break;
      case "vehicle":
        comparison = a.vehicle.licensePlate.localeCompare(b.vehicle.licensePlate);
        break;
      case "distance":
        comparison = (a.parsedData.distanceKm || 0) - (b.parsedData.distanceKm || 0);
        break;
      case "odometer":
        comparison =
          (a.parsedData.endOdometerKm || a.parsedData.startOdometerKm || 0) -
          (b.parsedData.endOdometerKm || b.parsedData.startOdometerKm || 0);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
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

      {/* Mobile: Card view */}
      <div className="lg:hidden space-y-3">
        {sortedList.map((registration: any) => {
          const data = registration.parsedData;
          const tripDate = new Date(data.timestamp);

          return (
            <Card key={registration.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header: Date and Vehicle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {tripDate.toLocaleDateString("nl-NL", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tripDate.toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <Badge variant="outline">{registration.vehicle.licensePlate}</Badge>
                  </div>

                  {/* Route */}
                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground">Van</div>
                    <div className="text-sm truncate">{data.departure?.text || "-"}</div>
                    <div className="text-xs text-muted-foreground">Naar</div>
                    <div className="text-sm truncate">{data.destination?.text || "-"}</div>
                  </div>

                  {/* Description */}
                  {data.description && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Omschrijving</div>
                      <div className="text-sm text-muted-foreground">{data.description}</div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Afstand</div>
                      <div className="text-sm font-semibold">
                        {data.distanceKm ? formatDistance(data.distanceKm) : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Begin km</div>
                      <div className="text-sm">
                        {data.startOdometerKm ? `${data.startOdometerKm.toLocaleString("nl-NL")}` : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Eind km</div>
                      <div className="text-sm">
                        {data.endOdometerKm ? `${data.endOdometerKm.toLocaleString("nl-NL")}` : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop: Data table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleSort("date")}
                    >
                      Datum & tijd
                      {getSortIcon("date")}
                    </Button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleSort("vehicle")}
                    >
                      Voertuig
                      {getSortIcon("vehicle")}
                    </Button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Van</TableHead>
                  <TableHead className="whitespace-nowrap">Naar</TableHead>
                  <TableHead className="whitespace-nowrap">Omschrijving</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleSort("distance")}
                    >
                      Afstand
                      {getSortIcon("distance")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleSort("odometer")}
                    >
                      Begin km
                      {getSortIcon("odometer")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">Eind km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedList.map((registration: any) => {
                  const data = registration.parsedData;
                  const tripDate = new Date(data.timestamp);

                  return (
                    <TableRow key={registration.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {tripDate.toLocaleDateString("nl-NL", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tripDate.toLocaleTimeString("nl-NL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{registration.vehicle.licensePlate}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {data.departure?.text || "-"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {data.destination?.text || "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                        {data.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {data.distanceKm ? formatDistance(data.distanceKm) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {data.startOdometerKm ? `${data.startOdometerKm.toLocaleString("nl-NL")} km` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {data.endOdometerKm ? `${data.endOdometerKm.toLocaleString("nl-NL")} km` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
