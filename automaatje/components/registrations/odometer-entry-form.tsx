"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Gauge, Info } from "lucide-react";
import { createOdometerEntry } from "@/lib/actions/registrations";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Vehicle {
  id: string;
  licensePlate: string;
  details: {
    naamVoertuig?: string;
    type: string;
    make?: string;
    model?: string;
  };
}

interface LastRegistration {
  id: string;
  vehicleId: string;
  data: any;
  vehicle: Vehicle;
}

interface OdometerEntryFormProps {
  vehicles: Vehicle[];
  lastRegistration?: LastRegistration | null;
}

export function OdometerEntryForm({
  vehicles,
  lastRegistration,
}: OdometerEntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Get last odometer and vehicle
  const lastData = lastRegistration?.data;
  const lastOdometer = lastData?.endOdometerKm ||
    (lastData?.startOdometerKm && lastData?.distanceKm ? lastData.startOdometerKm + lastData.distanceKm : lastData?.startOdometerKm);
  const lastVehicleId = lastRegistration?.vehicleId;

  // Form state - initialize with smart defaults
  const [selectedVehicle, setSelectedVehicle] = useState<string>(lastVehicleId || "");
  const [timestamp, setTimestamp] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [odometerKm, setOdometerKm] = useState(lastOdometer ? Math.round(lastOdometer).toString() : "");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("vehicleId", selectedVehicle);
    formData.append("timestamp", new Date(timestamp).toISOString());
    formData.append("startOdometerKm", odometerKm);
    if (description) {
      formData.append("description", description);
    }

    startTransition(async () => {
      const result = await createOdometerEntry(formData);

      if (!result.success) {
        setError(result.error || "Er is een fout opgetreden");
        return;
      }

      // Success - redirect to overview
      router.push("/registraties/overzicht");
      router.refresh();
    });
  };

  // Get vehicle label for display
  const getVehicleLabel = (vehicle: Vehicle) => {
    const name = vehicle.details.naamVoertuig;
    const makeModel = vehicle.details.make && vehicle.details.model
      ? `${vehicle.details.make} ${vehicle.details.model}`
      : null;

    if (name) {
      return `${name} (${vehicle.licensePlate})`;
    }
    if (makeModel) {
      return `${makeModel} (${vehicle.licensePlate})`;
    }
    return vehicle.licensePlate;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="pb-3 lg:pb-6">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <Gauge className="h-5 w-5" />
            Wat is je kilometerstand?
          </CardTitle>
          <CardDescription className="text-sm">
            Leg snel je huidige kilometerstand vast zonder rit details, handig als je periodiek je kilometerstand moet bijhouden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Voertuig *</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Selecteer een voertuig" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {getVehicleLabel(vehicle)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Selecteer het voertuig waarvoor je de kilometerstand vastlegt
            </p>
          </div>

          {/* Timestamp */}
          <div className="space-y-2">
            <Label htmlFor="timestamp">Tijdstip *</Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              required
              className="text-base"
            />
            <p className="text-sm text-muted-foreground">
              Wanneer heb je de kilometerstand afgelezen?
            </p>
          </div>

          {/* Odometer Reading */}
          <div className="space-y-2">
            <Label htmlFor="odometer">Kilometerstand *</Label>
            <div className="relative">
              <Input
                id="odometer"
                type="number"
                inputMode="numeric"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                placeholder="bijv. 45000"
                required
                min="0"
                step="1"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                km
              </span>
            </div>
            {lastOdometer && (
              <p className="text-sm text-muted-foreground">
                Vorige registratie: {Math.round(lastOdometer).toLocaleString("nl-NL")} km
              </p>
            )}
          </div>

          {/* Optional Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notitie (optioneel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="bijv. Tankbeurt, APK, etc."
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Optionele notitie bij deze kilometerstand
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Deze registratie bevat alleen de kilometerstand. Voor volledige rit details met
              vertrek- en aankomstadres, gebruik de{" "}
              <a href="/registraties/nieuw" className="underline font-medium">
                normale rit registratie
              </a>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Action Buttons - Sticky on mobile */}
      <div className="lg:hidden h-16" /> {/* Spacer for fixed button on mobile */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:p-0 z-10">
        <div className="flex gap-3 lg:justify-end max-w-2xl mx-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
            className="flex-1 lg:flex-none h-12 lg:h-10"
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            disabled={isPending || !selectedVehicle || !odometerKm}
            className="flex-[2] lg:flex-none h-12 lg:h-10"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opslaan...
              </>
            ) : (
              "Opslaan"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
