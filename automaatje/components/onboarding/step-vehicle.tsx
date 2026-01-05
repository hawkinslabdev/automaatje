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

interface StepVehicleProps {
  data: {
    licensePlate: string;
    vehicleType: "Auto" | "Motorfiets" | "Scooter" | "Fiets";
    vehicleName?: string;
  };
  errors: Record<string, string | undefined>;
  onChange: (field: string, value: string) => void;
}

export function StepVehicle({ data, errors, onChange }: StepVehicleProps) {
  const handleLicensePlateChange = (value: string) => {
    // Auto-format: uppercase and add dashes for 6-character plates
    let formatted = value.replace(/[\s-]/g, "").toUpperCase();

    if (formatted.length === 6) {
      formatted = `${formatted.slice(0, 2)}-${formatted.slice(2, 4)}-${formatted.slice(4, 6)}`;
    }

    onChange("licensePlate", formatted);
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
            placeholder="XX-XX-XX"
            value={data.licensePlate}
            onChange={(e) => handleLicensePlateChange(e.target.value)}
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
                Controleer of je kenteken klopt. Voorbeelden: 12-ABC-3, XX-00-XX, ZV-858-G
              </p>
            </div>
          )}
          {!errors.licensePlate && (
            <p className="text-xs text-muted-foreground">
              Nederlands kenteken (bijv. 12-ABC-3, ZV-858-G, of XX-00-XX)
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

        <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-muted-foreground">
            Voertuiggegevens (merk, model, bouwjaar) worden automatisch opgehaald na het aanmaken van je account.
          </p>
        </div>
      </div>
    </div>
  );
}
