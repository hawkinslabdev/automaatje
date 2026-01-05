import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info, AlertCircle } from "lucide-react";
import { useState } from "react";

interface StepOdometerTrackingProps {
  data: {
    odometerMode: "manual" | "auto_calculate";
    odometerFrequency?: "dagelijks" | "wekelijks" | "maandelijks";
    initialOdometerKm?: number;
    initialOdometerDate?: Date;
  };
  errors: Record<string, string | undefined>;
  onChange: (field: string, value: any) => void;
}

export function StepOdometerTracking({
  data,
  errors,
  onChange,
}: StepOdometerTrackingProps) {
  const [showFrequency, setShowFrequency] = useState(
    data.odometerMode === "auto_calculate"
  );

  const handleModeChange = (mode: "manual" | "auto_calculate") => {
    onChange("odometerMode", mode);
    setShowFrequency(mode === "auto_calculate");

    // Set default frequency when switching to auto-calculate
    if (mode === "auto_calculate" && !data.odometerFrequency) {
      onChange("odometerFrequency", "maandelijks");
    }

    // Set default date to today when switching to auto-calculate
    if (mode === "auto_calculate" && !data.initialOdometerDate) {
      onChange("initialOdometerDate", new Date());
    }
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Kilometerstand bijhouden</h2>
        <p className="text-sm text-muted-foreground">
          Kies hoe je kilometerstand wilt registreren
        </p>
      </div>

      <div className="space-y-4">
        {/* Mode Selection */}
        <div className="space-y-3">
          <Label>Tracking methode</Label>
          <RadioGroup
            value={data.odometerMode}
            onValueChange={(value) =>
              handleModeChange(value as "manual" | "auto_calculate")
            }
          >
            {/* Manual Mode */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="manual" id="mode-manual" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="mode-manual"
                  className="font-medium cursor-pointer"
                >
                  Handmatig invullen bij elke rit
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Je voert start- en eindstand in bij elke rit. Geschikt als je
                  altijd toegang hebt tot je teller.
                </p>
              </div>
            </div>

            {/* Auto-Calculate Mode */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem
                value="auto_calculate"
                id="mode-auto"
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="mode-auto" className="font-medium cursor-pointer">
                  Automatisch berekenen (aanbevolen)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Je voert periodiek je kilometerstand in. Het systeem berekent
                  automatisch start/eindstanden voor je ritten.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Auto-Calculate Options */}
        {showFrequency && (
          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
            {/* Frequency Selection */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Hoe vaak wil je de stand invoeren?</Label>
              <RadioGroup
                value={data.odometerFrequency || "maandelijks"}
                onValueChange={(value) => onChange("odometerFrequency", value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dagelijks" id="freq-daily" />
                  <Label htmlFor="freq-daily" className="font-normal cursor-pointer">
                    Dagelijks
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wekelijks" id="freq-weekly" />
                  <Label htmlFor="freq-weekly" className="font-normal cursor-pointer">
                    Wekelijks
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maandelijks" id="freq-monthly" />
                  <Label htmlFor="freq-monthly" className="font-normal cursor-pointer">
                    Maandelijks (aanbevolen)
                  </Label>
                </div>
              </RadioGroup>
              {errors.odometerFrequency && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{errors.odometerFrequency}</span>
                </div>
              )}
            </div>

            {/* Initial Odometer Reading */}
            <div className="space-y-2">
              <Label htmlFor="initialOdometer">Huidige kilometerstand</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="initialOdometer"
                  name="initialOdometer"
                  type="number"
                  placeholder="12345"
                  value={data.initialOdometerKm || ""}
                  onChange={(e) =>
                    onChange(
                      "initialOdometerKm",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  min="0"
                  step="1"
                  required
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  km
                </span>
              </div>
              {errors.initialOdometerKm && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{errors.initialOdometerKm}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Voer de huidige stand van je teller in
              </p>
            </div>

            {/* Initial Date */}
            <div className="space-y-2">
              <Label htmlFor="initialDate">Datum van aflezing</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="initialDate"
                  name="initialDate"
                  type="date"
                  value={formatDateForInput(data.initialOdometerDate)}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Parse date as local date to avoid timezone issues
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      onChange("initialOdometerDate", new Date(year, month - 1, day));
                    }
                  }}
                  max={formatDateForInput(new Date())}
                  required
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => onChange("initialOdometerDate", new Date())}
                  className="px-3 py-2 text-sm font-medium text-primary hover:text-primary/80 border border-input rounded-md hover:bg-accent transition-colors whitespace-nowrap"
                >
                  Vandaag
                </button>
              </div>
              {errors.initialOdometerDate && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{errors.initialOdometerDate}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Wanneer heb je deze stand afgelezen?
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/20 p-4 text-sm border border-blue-200 dark:border-blue-900">
          <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Belastingdienst vereisten
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              De Belastingdienst vereist start- en eindstand voor elke zakelijke
              rit. Bij automatisch berekenen worden deze afgeleid van je
              periodieke aflezingen via lineaire interpolatie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
