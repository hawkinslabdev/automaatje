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
import { Loader2, Gauge, X } from "lucide-react";
import { updateRegistration } from "@/lib/actions/registrations";
import { useToast } from "@/hooks/use-toast";

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

interface Registration {
  id: string;
  vehicleId: string;
  data: any;
  vehicle: Vehicle;
}

interface EditOdometerFormProps {
  registration: Registration;
  vehicles: Vehicle[];
}

export function EditOdometerForm({
  registration,
  vehicles,
}: EditOdometerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const registrationData = registration.data;

  // Initialize form state with existing data
  const [selectedVehicle, setSelectedVehicle] = useState<string>(registration.vehicleId);
  const [timestamp, setTimestamp] = useState(() => {
    const date = new Date(registrationData.timestamp);
    return date.toISOString().slice(0, 16);
  });
  const [odometerKm, setOdometerKm] = useState(
    registrationData.startOdometerKm ? registrationData.startOdometerKm.toString() : ""
  );
  const [description, setDescription] = useState(registrationData.description || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For odometer-only entries, we need to send the data in the format expected
    // We'll send as a trip with the "Kilometerstand registratie" placeholder addresses
    const formData = new FormData();
    formData.append("vehicleId", selectedVehicle);
    formData.append("timestamp", new Date(timestamp).toISOString());
    formData.append("startOdometerKm", odometerKm);
    formData.append("tripType", "zakelijk"); // Default for odometer entries

    // Use placeholder addresses to maintain odometer entry format
    formData.append("departureText", "Kilometerstand registratie");
    formData.append("destinationText", "Kilometerstand registratie");

    if (description) {
      formData.append("description", description);
    }

    startTransition(async () => {
      const result = await updateRegistration(registration.id, formData);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Fout bij opslaan",
          description: result.error || "Er is een fout opgetreden",
        });
        return;
      }

      // Success - show toast and redirect
      toast({
        title: "Kilometerstand bijgewerkt",
        description: "De wijzigingen zijn succesvol opgeslagen",
      });

      router.push("/registraties/overzicht");
      router.refresh();
    });
  };

  const handleCancel = () => {
    router.push("/registraties/overzicht");
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
            Kilometerstand bewerken
          </CardTitle>
          <CardDescription className="text-sm">
            Pas de kilometerstand registratie aan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">
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
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-4 lg:static bg-background pt-4 pb-2 lg:pb-0 z-10">
        <Button
          type="submit"
          disabled={isPending || !selectedVehicle || !odometerKm}
          className="flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Opslaan...
            </>
          ) : (
            "Wijzigingen opslaan"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
        >
          <X className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Annuleren</span>
        </Button>
      </div>
    </form>
  );
}
