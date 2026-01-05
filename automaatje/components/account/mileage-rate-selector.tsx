"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { updateMileageRateConfig } from "@/lib/actions/settings";
import { useRouter } from "next/navigation";

interface MileageRateSelectorProps {
  initialData: {
    rateType: "standard" | "custom" | "none";
    customRate?: number;
  };
  standardRates: Array<{
    country: string;
    year: number;
    businessRate: number;
    description: string;
  }>;
}

export function MileageRateSelector({
  initialData,
  standardRates,
}: MileageRateSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rateType, setRateType] = useState(initialData.rateType);
  const [customRate, setCustomRate] = useState(initialData.customRate || 0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get the latest NL rate for display
  const latestNLRate = standardRates.find((r) => r.country === "NL");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateMileageRateConfig({
        rateType,
        customRate: rateType === "custom" ? customRate : undefined,
      });

      if (result.success) {
        setSuccess(true);
        router.refresh();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Er is een fout opgetreden");
      }
    });
  };

  const hasChanges =
    rateType !== initialData.rateType ||
    (rateType === "custom" && customRate !== initialData.customRate);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Option 1: Standard Dutch rates */}
        <div
          className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
            rateType === "standard"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => setRateType("standard")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  rateType === "standard"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {rateType === "standard" && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Standaardtarieven voor Nederland</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Gebruik het standaardtarief voor belastingvrije kilometervergoeding voor Nederland
              </p>
              {latestNLRate && (
                <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {latestNLRate.year} Zakelijk
                    </span>
                    <span className="font-semibold">
                      € {latestNLRate.businessRate.toFixed(2).replace(".", ",")}
                      <span className="ml-1 text-muted-foreground">per km</span>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {latestNLRate.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Option 2: Custom rates */}
        <div
          className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
            rateType === "custom"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => setRateType("custom")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  rateType === "custom"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {rateType === "custom" && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Aangepaste tarieven</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Stel je eigen vergoedingstarieven in
              </p>

              {rateType === "custom" && (
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
                      value={customRate || ""}
                      onChange={(e) =>
                        setCustomRate(parseFloat(e.target.value) || 0)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">per km</span>
                  </div>
                  {customRate > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Je tarief: € {customRate.toFixed(2).replace(".", ",")} per
                      kilometer
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Option 3: No compensation */}
        <div
          className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
            rateType === "none"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => setRateType("none")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  rateType === "none"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {rateType === "none" && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
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
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <span>Kilometertarieven succesvol opgeslagen</span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!hasChanges || isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Opslaan..." : "Wijzigingen opslaan"}
        </Button>
        {hasChanges && !isPending && (
          <span className="text-sm text-muted-foreground">
            Je hebt niet-opgeslagen wijzigingen
          </span>
        )}
      </div>
    </form>
  );
}
