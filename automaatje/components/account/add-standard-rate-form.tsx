"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { updateStandardRate } from "@/lib/actions/settings";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AddStandardRateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [year, setYear] = useState<number>(new Date().getFullYear() + 1);
  const [rate, setRate] = useState<number>(0.23);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!year || year < 2020 || year > 2100) {
      setError("Voer een geldig jaar in (2020-2100)");
      return;
    }

    if (!rate || rate <= 0 || rate > 10) {
      setError("Voer een geldig tarief in (0,01 - 10,00)");
      return;
    }

    if (!description || description.trim().length === 0) {
      setError("Voer een omschrijving in");
      return;
    }

    startTransition(async () => {
      const result = await updateStandardRate({
        country: "NL",
        year,
        businessRate: rate,
        description: description.trim(),
      });

      if (result.success) {
        setSuccess(true);
        router.refresh();

        // Clear form
        setYear(year + 1);
        setRate(0.23);
        setDescription("");

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Er is een fout opgetreden");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuw standaardtarief toevoegen</CardTitle>
        <CardDescription>
          Voeg een standaardtarief toe voor een toekomstig jaar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Year Input */}
            <div className="space-y-2">
              <Label htmlFor="year">Jaar</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2100"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 0)}
                placeholder="2026"
                required
              />
            </div>

            {/* Rate Input */}
            <div className="space-y-2">
              <Label htmlFor="rate">Tarief per kilometer</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  placeholder="0,23"
                  required
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Omschrijving</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Belastingvrije kilometervergoeding 2026"
              required
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Beschrijf het tarief, bijvoorbeeld: &quot;Belastingvrije
              kilometervergoeding 2026&quot;
            </p>
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
              <span>Standaardtarief succesvol toegevoegd</span>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" />
            {isPending ? "Toevoegen..." : "Tarief toevoegen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
