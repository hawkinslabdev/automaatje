"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { AddressAutocomplete, type AddressSuggestion, type Location } from "@/components/ui/address-autocomplete";

interface StepLocationProps {
  data: {
    locationText: string;
    locationLat?: number;
    locationLon?: number;
    locationStatus: 'idle' | 'loading' | 'success' | 'error';
  };
  errors: Record<string, string | undefined>;
  onChange: (field: string, value: any) => void;
  onVerify: () => Promise<void>;
  onAddressSelect?: (suggestion: AddressSuggestion | Location) => void;
}

export function StepLocation({ data, errors, onChange, onVerify, onAddressSelect }: StepLocationProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Waar kom je vandaan?</h2>
        <p className="text-sm text-muted-foreground">
          Waar bevind je je meestal? Dit wordt gebruikt voor afstandsberekeningen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="locationText">Adres of stad</Label>
          <div className="flex gap-2">
            <AddressAutocomplete
              id="locationText"
              value={data.locationText}
              onChange={(value) => onChange("locationText", value)}
              onSelect={(suggestion) => {
                if (onAddressSelect) {
                  onAddressSelect(suggestion);
                }
              }}
              placeholder="Amsterdam of Keizersgracht 123, Amsterdam"
              disabled={data.locationStatus === 'loading'}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onVerify}
              disabled={!data.locationText || data.locationStatus === 'loading'}
              className="shrink-0"
              title="Verifieer adres"
            >
              {data.locationStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.locationText && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{errors.locationText}</span>
            </div>
          )}

          {data.locationStatus === 'success' && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Locatie gevonden en geverifieerd</span>
            </div>
          )}

          {data.locationStatus === 'error' && (
            <div className="flex flex-col gap-1 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Locatie niet gevonden</span>
              </div>
              <p className="text-xs">Je kunt toch doorgaan. Sommige functies werken mogelijk beperkt.</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Begin met typen om suggesties te zien. Klik op het kaart-icoon om
            handmatig te verifiëren. We gebruiken je locatie om automatisch
            afstanden te berekenen.
          </p>
        </div>
      </div>
    </div>
  );
}
