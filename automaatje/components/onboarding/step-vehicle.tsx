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
import { KentekenCheck } from "rdw-kenteken-check";

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
    // Just uppercase the input, preserve dashes if user typed them
    const uppercased = value.toUpperCase();
    onChange("licensePlate", uppercased);
  };

  const handleLicensePlateBlur = () => {
    // Format only when user leaves the field
    const cleaned = data.licensePlate.replace(/[\s-]/g, "");
    
    if (cleaned.length === 0) return;
    
    const kentekenCheck = new KentekenCheck(cleaned);
    
    if (kentekenCheck.valid) {
      const formatted = kentekenCheck.formatLicense();
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
          {!errors.licensePlate && data.licensePlate === "XX-XX-XX" && data.licensePlate.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-500">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Ongeldig kenteken</span>
              </div>
              <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                Dit kenteken voldoet niet aan de RDW standaarden.
              </p>
            </div>
          )}
          {!errors.licensePlate && data.licensePlate !== "XX-XX-XX" && (
            <p className="text-xs text-muted-foreground">
              Nederlands kenteken
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
