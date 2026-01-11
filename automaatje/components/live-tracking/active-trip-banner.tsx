import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, ArrowRight } from "lucide-react";
import type { LiveTrip } from "@/lib/db/schema";

interface ActiveTripBannerProps {
  trip: LiveTrip;
}

export function ActiveTripBanner({ trip }: ActiveTripBannerProps) {
  // Bereken duur
  const durationMs = Date.now() - new Date(trip.startedAt).getTime();
  const durationMinutes = Math.floor(durationMs / 1000 / 60);

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Navigation className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Actieve rit bezig</h3>
            <p className="text-sm text-muted-foreground">
              Gestart {durationMinutes < 1 ? 'zojuist' : `${durationMinutes} min geleden`}
              {trip.distanceKm && trip.distanceKm > 0 ? ` • ${trip.distanceKm.toFixed(1)} km` : ''}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/registraties/live">
            Ga verder
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
