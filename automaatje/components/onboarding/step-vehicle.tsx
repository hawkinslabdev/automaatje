import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, AlertCircle } from "lucide-react";
import { normalizeLicensePlate, isValidDutchLicensePlate } from "@/lib/validations/vehicle";

interface StepVehicleProps {
  data: {
    licensePlate: string;
    vehicleType: "Auto" | "Motorfiets" | "Scooter" | "Fiets";
    vehicleName?: string;
    initialOdometerKm?: number;
    initialOdometerDate?: string;
  };
  errors: Record<string, string | undefined>;
  onChange: (field: string, value: string | number | undefined) => void;
}

export function StepVehicle({ data, errors, onChange }: StepVehicleProps) {
  const handleLicensePlateChange = (value: string) => {
    // Just uppercase the input, preserve dashes if user typed them
    const uppercased = value.toUpperCase();
    onChange("licensePlate", uppercased);
  };

  const handleLicensePlateBlur = () => {
    // Only format if there are no dashes (user typed without formatting)
    if (data.licensePlate.includes('-') || data.licensePlate.length === 0) {
      return;
    }

    const cleaned = data.licensePlate.replace(/[\s]/g, "");

    if (isValidDutchLicensePlate(cleaned)) {
      const formatted = normalizeLicensePlate(cleaned);
      onChange("licensePlate", formatted);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Je voertuig</h2>
        <p className="text-sm text-muted-foreground">
          Voeg je eerste voertuig toe voor kilometerregistratie
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="licensePlate">Kenteken</Label>
          <Input
            id="licensePlate"
            name="licensePlate"
            type="text"
            placeholder="XX-00-XX"
            value={data.licensePlate}
            onChange={(e) => handleLicensePlateChange(e.target.value)}
            onBlur={handleLicensePlateBlur}
            className="uppercase"
            maxLength={8}
            required
          />
          {errors.licensePlate && (
            <div className="flex flex-col gap-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">{errors.licensePlate}</span>
              </div>
              <p className="text-xs text-destructive/80">
                Controleer of je kenteken klopt
              </p>
            </div>
          )}
          {!errors.licensePlate && data.licensePlate.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Voer je kenteken in met streepjes voor het beste resultaat (bijv. AB-123-C)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleType">Type voertuig</Label>
          <Select
            value={data.vehicleType}
            onValueChange={(value) => onChange("vehicleType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Auto">Auto</SelectItem>
              <SelectItem value="Motorfiets">Motorfiets</SelectItem>
              <SelectItem value="Scooter">Scooter</SelectItem>
              <SelectItem value="Fiets">Fiets</SelectItem>
            </SelectContent>
          </Select>
          {errors.vehicleType && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{errors.vehicleType}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleName">Naam (optioneel)</Label>
          <Input
            id="vehicleName"
            name="vehicleName"
            type="text"
            placeholder="bijv. Mijn auto"
            value={data.vehicleName || ""}
            onChange={(e) => onChange("vehicleName", e.target.value)}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            Geef je voertuig een herkenbare naam
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm hidden">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-muted-foreground">
            Voertuiggegevens (merk, model, bouwjaar) worden automatisch opgehaald na het aanmaken van je account.
          </p>
        </div>

        {/* Separator */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-1">Huidige kilometerstand (optioneel)</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Je kunt dit later nog toevoegen
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initialOdometerKm">Kilometerstand</Label>
              <Input
                id="initialOdometerKm"
                name="initialOdometerKm"
                type="number"
                placeholder="bijv. 45000"
                value={data.initialOdometerKm ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  onChange("initialOdometerKm", value ? parseInt(value, 10) : undefined);
                }}
                min={0}
                max={999999}
              />
              {errors.initialOdometerKm && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{errors.initialOdometerKm}</span>
                </div>
              )}
            </div>

            {data.initialOdometerKm !== undefined && data.initialOdometerKm > 0 && (
              <div className="space-y-2">
                <Label htmlFor="initialOdometerDate">Datum van aflezing</Label>
                <Input
                  id="initialOdometerDate"
                  name="initialOdometerDate"
                  type="date"
                  value={data.initialOdometerDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => onChange("initialOdometerDate", e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.initialOdometerDate && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">{errors.initialOdometerDate}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
