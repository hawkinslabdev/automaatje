"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, AlertCircle, MapPin, CheckCircle2 } from "lucide-react";
import { addFavoriteLocation } from "@/lib/actions/locations";
import { useRouter } from "next/navigation";
import { AddressAutocomplete, type AddressSuggestion, type Location } from "@/components/ui/address-autocomplete";
import { formatDutchAddress } from "@/lib/utils";

type LocationStatus = 'idle' | 'loading' | 'success' | 'error';

export function AddLocationDialog() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [locationLat, setLocationLat] = useState<number | undefined>();
  const [locationLon, setLocationLon] = useState<number | undefined>();
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleAddressSelect = (suggestion: AddressSuggestion | Location) => {
    if ('displayName' in suggestion) {
      // AddressSuggestion from Nominatim search
      const formattedAddress = formatDutchAddress(suggestion.address);
      setLocationText(formattedAddress);
      setLocationLat(suggestion.lat);
      setLocationLon(suggestion.lon);
    } else {
      // Location (home, favorite, previous, or GPS)
      setLocationText(suggestion.text);
      setLocationLat(suggestion.lat);
      setLocationLon(suggestion.lon);
    }
    setLocationStatus('success');
  };

  const handleVerify = async () => {
    if (!locationText.trim()) return;

    setLocationStatus('loading');
    setError(null);

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: locationText.trim() }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setLocationLat(result.data.lat);
        setLocationLon(result.data.lon);

        // Format the address if we got structured address data
        if (result.data.address) {
          const formattedAddress = formatDutchAddress(result.data.address);
          if (formattedAddress) {
            setLocationText(formattedAddress);
          }
        }

        setLocationStatus('success');
      } else {
        setLocationStatus('error');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setLocationStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!locationText.trim()) {
      setError("Voer een locatie in");
      return;
    }

    startTransition(async () => {
      const result = await addFavoriteLocation({
        text: locationText.trim(),
        lat: locationLat,
        lon: locationLon,
      });

      if (result.success) {
        // Reset form
        setLocationText("");
        setLocationLat(undefined);
        setLocationLon(undefined);
        setLocationStatus('idle');
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error || "Er is een fout opgetreden");
      }
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset on close
      setLocationText("");
      setLocationLat(undefined);
      setLocationLon(undefined);
      setLocationStatus('idle');
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Voorkeurslocatie toevoegen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Voorkeurslocatie toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een werklocatie toe aan je voorkeurslocaties. Verifieer het
              adres om automatische afstandsberekeningen mogelijk te maken.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location">Adres of locatie</Label>
              <div className="flex gap-2">
                <AddressAutocomplete
                  id="location"
                  value={locationText}
                  onChange={(value) => {
                    setLocationText(value);
                    setLocationStatus('idle');
                    setLocationLat(undefined);
                    setLocationLon(undefined);
                  }}
                  onSelect={handleAddressSelect}
                  placeholder="Bijv. Dam 1 Amsterdam of Kantoor Utrecht"
                  disabled={isPending}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerify}
                  disabled={!locationText.trim() || locationStatus === 'loading' || isPending}
                  className="shrink-0"
                  title="Verifieer adres"
                >
                  {locationStatus === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Success Status */}
              {locationStatus === 'success' && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Locatie gevonden en geverifieerd</p>
                    {locationLat && locationLon && (
                      <p className="text-xs opacity-80">
                        Coördinaten: {locationLat.toFixed(6)}, {locationLon.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error Status */}
              {locationStatus === 'error' && (
                <div className="flex flex-col gap-1 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Locatie niet gevonden</span>
                  </div>
                  <p className="text-xs">
                    Je kunt toch doorgaan. Automatische afstandsberekeningen
                    werken mogelijk beperkt voor deze locatie.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Begin met typen om suggesties te zien. Klik op het kaart-icoon
                om een adres handmatig te verifiëren.
              </p>
            </div>

            {/* Submission Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending || !locationText.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Toevoegen..." : "Toevoegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
