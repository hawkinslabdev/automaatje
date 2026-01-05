import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface StepMileageRatesProps {
  data: {
    rateType: "standard" | "custom" | "none";
    customRate?: number;
  };
  errors: Record<string, string | undefined>;
  onChange: (field: string, value: any) => void;
  onSkip: () => void;
}

export function StepMileageRates({ data, errors, onChange, onSkip }: StepMileageRatesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Kilometertarieven</h2>
        <p className="text-sm text-muted-foreground">
          Je kunt dit later nog wijzigen of iets toevoegen.
        </p>
      </div>

      <div className="space-y-4">
        {/* Option 1: Standard Dutch rates */}
        <div
          className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
            data.rateType === "standard"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("rateType", "standard")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div
                className={`h-5 w-5 rounded-full border-2 transition-colors ${
                  data.rateType === "standard"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {data.rateType === "standard" && (
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Standaardtarieven voor Nederland</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Gebruik het standaardtarief voor belastingvrije kilometervergoeding voor Nederland:
              </p>
              <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                <span className="font-medium">2026 Zakelijk</span>
                <span className="mx-2">........</span>
                <span className="font-semibold">€ 0,23</span>
                <span className="text-muted-foreground"> per km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Option 2: Custom rates */}
        <div
          className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
            data.rateType === "custom"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("rateType", "custom")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div
                className={`h-5 w-5 rounded-full border-2 transition-colors ${
                  data.rateType === "custom"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {data.rateType === "custom" && (
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Aangepaste tarieven</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Stel je eigen vergoedingstarieven in
              </p>

              {data.rateType === "custom" && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="customRate">Tarief per kilometer</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">€</span>
                    <Input
                      id="customRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="0,23"
                      value={data.customRate || ""}
                      onChange={(e) => onChange("customRate", parseFloat(e.target.value) || 0)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">per km</span>
                  </div>
                  {errors.customRate && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.customRate}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Option 3: No compensation */}
        <div
          className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
            data.rateType === "none"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("rateType", "none")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div
                className={`h-5 w-5 rounded-full border-2 transition-colors ${
                  data.rateType === "none"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {data.rateType === "none" && (
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Geen vergoeding</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Toon alleen afstanden en uitsplitsing in percentage
              </p>
            </div>
          </div>
        </div>

        {/* Skip button */}
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            Overslaan
          </Button>
        </div>

        {errors.rateType && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{errors.rateType}</span>
          </div>
        )}
      </div>
    </div>
  );
}
