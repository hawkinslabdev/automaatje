"use client";

import * as React from "react";
import Link from "next/link";
import { Car, MapPin, Calendar, Gauge, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDutchDateTime, formatDistance } from "@/lib/utils";

interface TripCardProps {
  trip: {
    id: string;
    timestamp: number;
    data: {
      tripType?: "zakelijk" | "privé";
      departure?: { text?: string };
      destination?: { text?: string };
      startOdometerKm?: number;
      endOdometerKm?: number;
      distanceKm?: number;
      description?: string;
      calculationMethod?: string;
    };
    vehicle: {
      licensePlate: string;
      details: {
        make?: string;
        model?: string;
        naamVoertuig?: string;
      };
    };
  };
  className?: string;
}

export function TripCard({ trip, className }: TripCardProps) {
  const { data, vehicle, timestamp } = trip;

  // Format vehicle display
  const vehicleName = vehicle.details.naamVoertuig ||
    (vehicle.details.make && vehicle.details.model
      ? `${vehicle.details.make} ${vehicle.details.model}`
      : vehicle.licensePlate);

  // Determine if this is an odometer-only entry
  const isOdometerOnly = !data.destination && !data.departure;

  // Get trip type styling
  const tripTypeVariant = data.tripType === "zakelijk" ? "default" : "secondary";
  const tripTypeLabel = data.tripType === "zakelijk" ? "Zakelijk" : "Privé";

  return (
    <Link href={`/registraties/overzicht/${trip.id}`} className="block">
      <Card className={cn(
        "transition-all hover:shadow-md active:scale-[0.98]",
        className
      )}>
        <CardContent className="p-4">
          {/* Header: Vehicle & Badge */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Car className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                {vehicleName}
              </span>
            </div>
            {data.tripType && (
              <Badge variant={tripTypeVariant} className="shrink-0 text-xs">
                {tripTypeLabel}
              </Badge>
            )}
          </div>

          {/* Route or Odometer Info */}
          {isOdometerOnly ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Gauge className="h-4 w-4 shrink-0" />
              <span>
                Kilometerstand: {data.startOdometerKm?.toLocaleString("nl-NL")} km
              </span>
            </div>
          ) : (
            <div className="space-y-1.5 mb-3">
              {data.departure?.text && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground truncate">
                    {data.departure.text}
                  </span>
                </div>
              )}
              {data.destination?.text && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-medium truncate">
                    {data.destination.text}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Description (if present) */}
          {data.description && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
              <FileText className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{data.description}</span>
            </div>
          )}

          {/* Footer: Date, Time & Distance */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3 mt-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDutchDateTime(new Date(timestamp))}</span>
            </div>
            {data.distanceKm !== undefined && data.distanceKm > 0 && (
              <span className="font-semibold text-foreground">
                {formatDistance(data.distanceKm)}
              </span>
            )}
          </div>

          {/* Odometer Range (if available) */}
          {data.startOdometerKm !== undefined && data.endOdometerKm !== undefined && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
              <span>
                Kilometerstand: {data.startOdometerKm.toLocaleString("nl-NL")} → {data.endOdometerKm.toLocaleString("nl-NL")} km
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
