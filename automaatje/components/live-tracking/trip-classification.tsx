"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Briefcase, Home, Car, AlertCircle, Loader2 } from "lucide-react";
import { classifyLiveTrip } from "@/lib/actions/live-trips";
import type { LiveTrip } from "@/lib/db/schema";

interface TripClassificationProps {
  trip: LiveTrip;
  preType?: string;
  preNotes?: string;
}

type TripType = "BUSINESS" | "PRIVATE" | "COMMUTE";

const KM_RATE = 0.23; // Nederlandse kilometervergoeding per km

export function TripClassification({ trip, preType, preNotes }: TripClassificationProps) {
  const router = useRouter();

  // Pre-fill with data from tracking if available
  const [selectedType, setSelectedType] = useState<TripType | null>(
    preType === "BUSINESS" ? "BUSINESS" : preType === "PRIVATE" ? "PRIVATE" : null
  );
  const [notes, setNotes] = useState(preNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedType) {
      setError("Selecteer eerst een rittype");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await classifyLiveTrip({
        tripId: trip.id,
        tripType: selectedType,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        // Redirect naar overzicht
        router.push("/registraties/overzicht");
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Classification error:", err);
      setError("Er is een fout opgetreden");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}u ${minutes}m`;
    }
    return `${minutes} minuten`;
  };

  const totalEuros = (trip.distanceKm || 0) * KM_RATE;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Classificeer je rit</h1>
          <p className="text-primary-foreground/80">
            Was dit een zakelijke, privé of woon-werk rit?
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Trip summary */}
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Afstand</div>
              <div className="text-2xl font-bold text-primary">
                {(trip.distanceKm || 0).toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Waarde</div>
              <div className="text-2xl font-bold">€ {totalEuros.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Duur</div>
              <div className="text-lg font-medium">
                {formatDuration(trip.durationSeconds || 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Starttijd</div>
              <div className="text-lg font-medium">
                {new Date(trip.startedAt).toLocaleTimeString("nl-NL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {trip.startAddress && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">Van</div>
              <div className="font-medium">{trip.startAddress}</div>
            </div>
          )}

          {trip.endAddress && (
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">Naar</div>
              <div className="font-medium">{trip.endAddress}</div>
            </div>
          )}
        </Card>

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Trip type selection */}
        <div className="space-y-3">
          <Label>Rittype</Label>
          <div className="grid grid-cols-1 gap-3">
            {/* Zakelijk */}
            <button
              type="button"
              onClick={() => setSelectedType("BUSINESS")}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${
                  selectedType === "BUSINESS"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                  p-3 rounded-lg
                  ${selectedType === "BUSINESS" ? "bg-primary text-primary-foreground" : "bg-muted"}
                `}
                >
                  <Briefcase className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Zakelijk</div>
                  <div className="text-sm text-muted-foreground">
                    Voor werk of zakelijke afspraken
                  </div>
                </div>
              </div>
            </button>

            {/* Privé */}
            <button
              type="button"
              onClick={() => setSelectedType("PRIVATE")}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${
                  selectedType === "PRIVATE"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                  p-3 rounded-lg
                  ${selectedType === "PRIVATE" ? "bg-primary text-primary-foreground" : "bg-muted"}
                `}
                >
                  <Home className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Privé</div>
                  <div className="text-sm text-muted-foreground">
                    Voor persoonlijke doeleinden
                  </div>
                </div>
              </div>
            </button>

            {/* Woon-werk */}
            <button
              type="button"
              onClick={() => setSelectedType("COMMUTE")}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${
                  selectedType === "COMMUTE"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                  p-3 rounded-lg
                  ${selectedType === "COMMUTE" ? "bg-primary text-primary-foreground" : "bg-muted"}
                `}
                >
                  <Car className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Woon-werk</div>
                  <div className="text-sm text-muted-foreground">
                    Van huis naar werk of andersom
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Notes field */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notitie (optioneel)</Label>
          <Textarea
            id="notes"
            placeholder="Bijv. klantbezoek, vergadering, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit button */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/registraties/overzicht")}
            disabled={isSubmitting}
          >
            Annuleren
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
          >
            {isSubmitting ? (
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
    </div>
  );
}
