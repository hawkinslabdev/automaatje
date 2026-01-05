"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeRegistration } from "@/lib/actions/registrations";
import { Loader2 } from "lucide-react";

interface CompleteTripDialogProps {
  tripId?: string;
  tripData?: {
    id: string;
    vehicleName: string;
    startOdometer: number;
    timestamp: number;
    departure: string;
    destination: string;
  };
}

export function CompleteTripDialog({ tripId, tripData }: CompleteTripDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [endOdometer, setEndOdometer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Open dialog when tripId or complete param is present
  useEffect(() => {
    const completeParam = searchParams.get("complete");
    if (tripId || completeParam) {
      setIsOpen(true);
    }
  }, [tripId, searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    setEndOdometer("");
    setError("");

    // Remove query param from URL
    const params = new URLSearchParams(searchParams);
    params.delete("complete");
    params.delete("incomplete");
    router.replace(`/registraties/overzicht?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const odometerValue = parseFloat(endOdometer);
    if (!odometerValue || odometerValue <= 0) {
      setError("Voer een geldige kilometerstand in");
      return;
    }

    if (!tripData?.id && !tripId) {
      setError("Geen rit geselecteerd");
      return;
    }

    const registrationId = tripData?.id || tripId!;

    setIsSubmitting(true);

    try {
      const result = await completeRegistration(registrationId, odometerValue);

      if (result.success) {
        handleClose();
        router.refresh(); // Refresh to show updated data
      } else {
        setError(result.error || "Kon rit niet voltooien");
      }
    } catch (err) {
      setError("Er is een fout opgetreden");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tripData && !tripId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rit voltooien</DialogTitle>
            <DialogDescription>
              Vul de eindstand in om deze rit te voltooien
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {tripData && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Voertuig:</span> {tripData.vehicleName}
                </div>
                <div>
                  <span className="font-medium">Beginstand:</span>{" "}
                  {tripData.startOdometer.toLocaleString("nl-NL")} km
                </div>
                {tripData.departure && (
                  <div>
                    <span className="font-medium">Van:</span> {tripData.departure}
                  </div>
                )}
                {tripData.destination && (
                  <div>
                    <span className="font-medium">Naar:</span> {tripData.destination}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2 pt-2">
              <Label htmlFor="endOdometer">
                Eindstand
              </Label>
              <Input
                id="endOdometer"
                type="number"
                step="1"
                min={tripData ? tripData.startOdometer + 1 : 1}
                value={endOdometer}
                onChange={(e) => setEndOdometer(e.target.value)}
                placeholder="Bijv. 12500"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Voltooien
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
