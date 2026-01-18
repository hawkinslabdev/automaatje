import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Car, Euro, ClipboardList, Edit2 } from "lucide-react";

interface StepConfirmationData {
  // Step 1: Account
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2: Location
  locationText: string;
  locationLat?: number;
  locationLon?: number;
  // Step 3: Tracking Mode
  trackingMode: "full_registration" | "simple_reimbursement";
  // Step 4: Vehicle + Odometer
  licensePlate: string;
  vehicleType: "Auto" | "Motorfiets" | "Scooter" | "Fiets";
  vehicleName?: string;
  initialOdometerKm?: number;
  initialOdometerDate?: string;
  // Step 5: Mileage Rates
  rateType: "standard" | "custom" | "none";
  customRate?: number;
}

interface StepConfirmationProps {
  data: StepConfirmationData;
  onEdit: (step: number) => void;
}

export function StepConfirmation({ data, onEdit }: StepConfirmationProps) {
  const getTrackingModeLabel = () => {
    return data.trackingMode === "full_registration"
      ? "Volledige ritregistratie"
      : "Eenvoudige kilometervergoeding";
  };

  const getTrackingModeDescription = () => {
    return data.trackingMode === "full_registration"
      ? "Gesloten kilometerstand, vertrek- en aankomstadres"
      : "Alleen kilometers, geen adresinvoer";
  };

  const formatOdometerDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Bevestiging</h2>
        <p className="text-sm text-muted-foreground">
          Controleer je gegevens voordat je je account aanmaakt
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Step 1: Personal Info + Account */}
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium">Wie ben je?</h3>
                    <p className="text-sm text-muted-foreground">{data.name}</p>
                    <p className="text-sm text-muted-foreground">{data.email}</p>
                    <p className="text-sm text-muted-foreground">Wachtwoord: ••••••••</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(1)}
                  className="gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Wijzigen
                </Button>
              </div>

              <Separator />

              {/* Step 2: Location */}
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium">Locatie</h3>
                    <p className="text-sm text-muted-foreground">{data.locationText}</p>
                    {data.locationLat && data.locationLon && (
                      <p className="text-xs text-muted-foreground">
                        Geverifieerd ({data.locationLat.toFixed(4)}, {data.locationLon.toFixed(4)})
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(2)}
                  className="gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Wijzigen
                </Button>
              </div>

              <Separator />

              {/* Step 3: Tracking Mode */}
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <ClipboardList className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium">Registratiemethode</h3>
                    <p className="text-sm text-muted-foreground">{getTrackingModeLabel()}</p>
                    <p className="text-xs text-muted-foreground">{getTrackingModeDescription()}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(3)}
                  className="gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Wijzigen
                </Button>
              </div>

              <Separator />

              {/* Step 4: Vehicle + Odometer */}
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium">Voertuig</h3>
                    <p className="text-sm text-muted-foreground">
                      {data.vehicleName || data.licensePlate}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.vehicleType} • {data.licensePlate}
                    </p>
                    {data.initialOdometerKm !== undefined && data.initialOdometerKm > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Kilometerstand: {data.initialOdometerKm.toLocaleString("nl-NL")} km
                        {data.initialOdometerDate && ` (${formatOdometerDate(data.initialOdometerDate)})`}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(4)}
                  className="gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Wijzigen
                </Button>
              </div>

              <Separator />

              {/* Step 5: Mileage Rates */}
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <Euro className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium">Kilometertarieven</h3>
                    {data.rateType === "standard" && (
                      <p className="text-sm text-muted-foreground">
                        Standaardtarieven voor Nederland (€ 0,23 per km)
                      </p>
                    )}
                    {data.rateType === "custom" && (
                      <p className="text-sm text-muted-foreground">
                        Aangepast tarief: € {data.customRate?.toFixed(2) || "0,00"} per km
                      </p>
                    )}
                    {data.rateType === "none" && (
                      <p className="text-sm text-muted-foreground">
                        Geen vergoeding (alleen afstanden)
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(5)}
                  className="gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Wijzigen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          Door je account aan te maken, ga je akkoord met onze algemene voorwaarden en privacybeleid.
        </p>
      </div>
    </div>
  );
}
