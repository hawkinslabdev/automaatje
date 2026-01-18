"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Star, Power, Trash2, Loader2, RefreshCw, Edit } from "lucide-react";
import { toggleVehicleEnabled, setMainVehicle, deleteVehicle, fetchVehicleDetails } from "@/lib/actions/vehicles";
import { getVehicleTrackingMode, getModeLabelShort, getModeBadgeVariant } from "@/lib/utils/vehicle-modes";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface VehicleCardProps {
  vehicle: {
    id: string;
    licensePlate: string;
    details: {
      naamVoertuig?: string;
      type: "Auto" | "Motorfiets" | "Scooter" | "Fiets";
      land: string;
      kilometerstandTracking?: "niet_registreren" | "dagelijks" | "wekelijks" | "maandelijks";
      trackingMode?: "full_registration" | "simple_reimbursement";
      isMain?: boolean;
      isEnabled?: boolean;
      make?: string;
      model?: string;
      year?: number;
      detailsStatus?: "PENDING" | "READY" | "FAILED";
      fetchError?: string;
    };
  };
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const details = vehicle.details;
  const trackingMode = getVehicleTrackingMode(vehicle);

  async function handleToggleEnabled() {
    setIsLoading(true);
    const result = await toggleVehicleEnabled(vehicle.id);
    if (!result.success) {
      alert(result.error);
    }
    setIsLoading(false);
    router.refresh();
  }

  async function handleSetMain() {
    setIsLoading(true);
    const result = await setMainVehicle(vehicle.id);
    if (!result.success) {
      alert(result.error);
    }
    setIsLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Weet je zeker dat je ${vehicle.licensePlate} wilt verwijderen?`)) {
      return;
    }

    setIsLoading(true);
    const result = await deleteVehicle(vehicle.id);
    if (!result.success) {
      alert(result.error);
    }
    setIsLoading(false);
    router.refresh();
  }

  async function handleRetryFetch() {
    setIsFetching(true);
    const result = await fetchVehicleDetails(vehicle.id);
    if (!result.success) {
      alert(result.error || "Kon voertuiggegevens niet ophalen");
    }
    setIsFetching(false);
    router.refresh();
  }

  return (
    <Card className={!details.isEnabled ? "opacity-60" : ""}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold">
              {details.naamVoertuig || vehicle.licensePlate}
            </CardTitle>
            {details.isMain && (
              <Badge variant="default" className="text-xs">
                Hoofdvoertuig
              </Badge>
            )}
            <Badge variant={getModeBadgeVariant(trackingMode)} className="text-xs">
              {getModeLabelShort(trackingMode)}
            </Badge>
            {!details.isEnabled && (
              <Badge variant="secondary" className="text-xs">
                Uitgeschakeld
              </Badge>
            )}
          </div>
          {details.naamVoertuig && (
            <p className="text-sm text-muted-foreground">
              {vehicle.licensePlate}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isLoading}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/garage/${vehicle.id}/bewerken`)}>
              <Edit className="mr-2 h-4 w-4" />
              Bewerken
            </DropdownMenuItem>
            {!details.isMain && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSetMain}>
                  <Star className="mr-2 h-4 w-4" />
                  Als hoofdvoertuig instellen
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleEnabled}>
              <Power className="mr-2 h-4 w-4" />
              {details.isEnabled ? "Uitschakelen" : "Inschakelen"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{details.type}</p>
          </div>
          {details.land && details.land !== "Nederland" && (
            <div>
              <p className="text-muted-foreground">Land</p>
              <p className="font-medium">{details.land}</p>
            </div>
          )}
          {details.detailsStatus === "READY" && details.make && (
            <div>
              <p className="text-muted-foreground">Merk & Model</p>
              <p className="font-medium">
                {details.make} {details.model}
              </p>
            </div>
          )}
          {details.detailsStatus === "READY" && details.year && (
            <div>
              <p className="text-muted-foreground">Bouwjaar</p>
              <p className="font-medium">{details.year}</p>
            </div>
          )}
        </div>

        {details.kilometerstandTracking && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Melding kilometerstand bijhouden:{" "}
              <span className="font-medium">
                {details.kilometerstandTracking === "dagelijks" && "dagelijks"}
                {details.kilometerstandTracking === "wekelijks" && "iedere week"}
                {details.kilometerstandTracking === "maandelijks" && "ieder maand"}
                {details.kilometerstandTracking === "niet_registreren" && "uitgeschakeld (je krijgt geen meldingen)"}
              </span>
            </p>
          </div>
        )}

        {details.detailsStatus === "PENDING" && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Voertuiggegevens worden opgehaald van RDW...
              </p>
            </div>
          </div>
        )}

        {details.detailsStatus === "FAILED" && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <p className="text-xs text-destructive">
                {details.fetchError || "Kon voertuiggegevens niet ophalen"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={handleRetryFetch}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Bezig...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Opnieuw proberen
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
