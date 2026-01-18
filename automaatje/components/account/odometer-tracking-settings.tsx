"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Gauge,
  Calendar,
  Info,
  Settings2,
  Bell,
  Car,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { updateOdometerTrackingSettings } from "@/lib/actions/user-settings";
import { formatDutchDateTime } from "@/lib/utils";

interface Vehicle {
  id: string;
  licensePlate: string;
  details: any;
}

interface Registration {
  id: string;
  vehicleId: string;
  data: any;
  createdAt: Date;
}

interface OdometerPreferences {
  mode?: "manual" | "auto_calculate";
  defaultFrequency?: "dagelijks" | "wekelijks" | "maandelijks";
  notificationsEnabled?: boolean;
}

interface Props {
  user: any;
  vehicles: Vehicle[];
  registrations: Registration[];
  currentPreferences?: OdometerPreferences;
}

export function OdometerTrackingSettings({
  user,
  vehicles,
  registrations,
  currentPreferences
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [mode, setMode] = useState<"manual" | "auto_calculate">(
    currentPreferences?.mode || "manual"
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    currentPreferences?.notificationsEnabled !== false
  );

  // Filter meterstand entries per vehicle
  const getMeterstandEntriesForVehicle = (vehicleId: string) => {
    return registrations
      .filter(reg => {
        const data = reg.data as any;
        return (
          reg.vehicleId === vehicleId &&
          (data.type === "meterstand" ||
           (data.departure?.text === "Kilometerstand registratie" &&
            data.destination?.text === "Kilometerstand registratie"))
        );
      })
      .sort((a, b) => {
        const aTime = (a.data as any).timestamp;
        const bTime = (b.data as any).timestamp;
        return bTime - aTime; // Most recent first
      })
      .slice(0, 5); // Show last 5 readings
  };

  // Get latest odometer reading for a vehicle
  const getLatestOdometer = (vehicleId: string) => {
    const meterstandEntries = getMeterstandEntriesForVehicle(vehicleId);
    if (meterstandEntries.length === 0) {
      return null;
    }
    const latest = meterstandEntries[0];
    return (latest.data as any).startOdometerKm;
  };

  // Get expected next reading date based on vehicle's frequency
  const getNextReadingDate = (vehicleId: string, vehicleFreq: string) => {
    const meterstandEntries = getMeterstandEntriesForVehicle(vehicleId);
    if (meterstandEntries.length === 0) {
      return null;
    }

    const latest = meterstandEntries[0];
    const lastTimestamp = (latest.data as any).timestamp;
    const lastDate = new Date(lastTimestamp);
    return calculateNextDate(lastDate, vehicleFreq);
  };

  const calculateNextDate = (lastDate: Date, freq: string) => {
    const next = new Date(lastDate);
    switch (freq) {
      case "dagelijks":
        next.setDate(next.getDate() + 1);
        break;
      case "wekelijks":
        next.setDate(next.getDate() + 7);
        break;
      case "maandelijks":
        next.setMonth(next.getMonth() + 1);
        break;
    }
    return next;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateOdometerTrackingSettings({
        mode,
        notificationsEnabled,
      });

      if (!result.success) {
        setError(result.error || "Er is een fout opgetreden");
        return;
      }

      setSuccess("Instellingen opgeslagen");
      router.refresh();
    });
  };

  const frequencyLabels = {
    dagelijks: "Dagelijks",
    wekelijks: "Wekelijks",
    maandelijks: "Maandelijks",
  };

  return (
    <div className="space-y-6">
      {/* Current Mode Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Tracking methode
          </CardTitle>
          <CardDescription>
            Kies hoe je kilometerstand wordt bijgehouden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Deze instelling geldt alleen voor voertuigen met <strong>volledige ritregistratie</strong> modus.
              Voertuigen met <strong>eenvoudige kilometervergoeding</strong> modus gebruiken alleen afstand invoer.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Label>Methode</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as "manual" | "auto_calculate")}
              disabled={isPending}
            >
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="manual" id="mode-manual-settings" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="mode-manual-settings" className="font-medium cursor-pointer">
                    Handmatig invullen bij elke rit
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Je voert start- en eindstand in bij elke rit
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="auto_calculate" id="mode-auto-settings" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="mode-auto-settings" className="font-medium cursor-pointer">
                    Automatisch berekenen
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Het systeem berekent start/eindstand op basis van periodieke aflezingen
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {mode === "auto_calculate" && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <Alert>
                <Settings2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Aflees frequentie per voertuig instellen</p>
                    <p className="text-sm">
                      De frequentie waarmee je de kilometerstand invoert (dagelijks/wekelijks/maandelijks)
                      stel je in per voertuig in de Garage.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/garage")}
                      className="mt-2"
                    >
                      <Car className="h-4 w-4 mr-2" />
                      Naar Garage
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications-enabled">Herinneringen</Label>
                  <p className="text-sm text-muted-foreground">
                    Ontvang herinneringen om je kilometerstand in te voeren
                  </p>
                </div>
                <Switch
                  id="notifications-enabled"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Vehicle Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Kilometerstand per voertuig
          </CardTitle>
          <CardDescription>
            Overzicht van je voertuigen en hun laatste kilometerstanden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Je hebt nog geen voertuigen toegevoegd
            </p>
          ) : (
            vehicles.map((vehicle) => {
              const vehicleDetails = vehicle.details;
              const latestOdometer = getLatestOdometer(vehicle.id);
              const tracking = vehicleDetails.kilometerstandTracking || "niet_registreren";
              const nextReadingDate = mode === "auto_calculate" && tracking !== "niet_registreren"
                ? getNextReadingDate(vehicle.id, tracking)
                : null;
              const meterstandEntries = getMeterstandEntriesForVehicle(vehicle.id);

              return (
                <div key={vehicle.id} className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {vehicleDetails.naamVoertuig || `${vehicleDetails.make || ""} ${vehicleDetails.model || ""}`.trim() || vehicle.licensePlate}
                        </h3>
                        {vehicleDetails.isMain && (
                          <Badge variant="secondary" className="text-xs">
                            Hoofdvoertuig
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.licensePlate}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/registraties/meterstand?vehicle=${vehicle.id}`)}
                    >
                      Nieuwe stand invoeren
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground mb-1">Laatste stand</div>
                      <div className="text-2xl font-bold">
                        {latestOdometer ? latestOdometer.toLocaleString("nl-NL") : "-"}
                        <span className="text-sm font-normal text-muted-foreground ml-1">km</span>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground mb-1">Tracking</div>
                      <div className="text-lg font-medium">
                        {tracking === "niet_registreren"
                          ? "Niet actief"
                          : frequencyLabels[tracking as keyof typeof frequencyLabels] || tracking}
                      </div>
                    </div>

                    {nextReadingDate && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground mb-1">Volgende aflezing</div>
                        <div className="text-lg font-medium">
                          {new Date(nextReadingDate).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* History */}
                  {meterstandEntries.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recente aflezingen</h4>
                      <div className="space-y-2">
                        {meterstandEntries.map((entry) => {
                          const data = entry.data as any;
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <Gauge className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {data.startOdometerKm.toLocaleString("nl-NL")} km
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(data.timestamp).toLocaleDateString("nl-NL", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {vehicle.id !== vehicles[vehicles.length - 1].id && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Over kilometerstand tracking</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>Handmatig</strong>: Je voert bij elke rit de begin- en eindstand in
              </li>
              <li>
                <strong>Automatisch</strong>: Je voert periodiek je kilometerstand in, het systeem
                berekent automatisch de tussenstanden via lineaire interpolatie
              </li>
              <li>
                Beide methodes voldoen aan de eisen van de Belastingdienst voor rittenregistratie
              </li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
