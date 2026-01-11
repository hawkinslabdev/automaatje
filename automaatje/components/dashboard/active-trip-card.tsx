"use client";

import Link from "next/link";
import { Navigation, Clock, MapPin, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface ActiveTripCardProps {
  trip: {
    id: string;
    startedAt: Date;
    startAddress: string | null;
    distanceKm: number | null;
    vehicle: {
      licensePlate: string;
    } | null;
  };
}

export function ActiveTripCard({ trip }: ActiveTripCardProps) {
  const [duration, setDuration] = useState(0);

  // Update duration every second
  useEffect(() => {
    const updateDuration = () => {
      const now = Date.now();
      const start = new Date(trip.startedAt).getTime();
      const seconds = Math.floor((now - start) / 1000);
      setDuration(seconds);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [trip.startedAt]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const distance = trip.distanceKm || 0;

  return (
    <Card className="border-green-500 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <Navigation className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Je bent nog bezig met een rit
                <Badge variant="secondary" className="bg-green-500 text-white">
                  <span className="flex h-2 w-2 mr-1">
                    <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  Bezig
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                GPS tracking is actief
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-background p-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Duur</p>
              <p className="text-base font-semibold">{formatDuration(duration)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-background p-3">
            <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Afstand</p>
              <p className="text-base font-semibold">{distance.toFixed(1)} km</p>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="space-y-2 rounded-lg bg-background p-3">
          {trip.startAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Vertrek</p>
                <p className="text-sm truncate">{trip.startAddress}</p>
              </div>
            </div>
          )}
          {trip.vehicle && (
            <div className="flex items-start gap-2">
              <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Voertuig</p>
                <p className="text-sm font-medium">{trip.vehicle.licensePlate}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button asChild className="flex-1" size="lg">
            <Link href="/registraties/live">
              Doorgaan met registreren
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
