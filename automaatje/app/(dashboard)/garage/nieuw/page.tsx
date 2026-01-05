"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addVehicle, getUserVehicles } from "@/lib/actions/vehicles";

export default function NieuweVoertuigPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [isMainVehicle, setIsMainVehicle] = useState(false);

  // Fetch vehicle count on mount
  useEffect(() => {
    async function fetchCount() {
      const result = await getUserVehicles();
      if (result.success && result.data) {
        const count = result.data.length;
        setVehicleCount(count);
        setIsMainVehicle(count === 0); // Auto true for first vehicle
      }
    }
    fetchCount();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await addVehicle(formData);

      if (result.success) {
        router.push("/garage");
        router.refresh();
      } else {
        setError(result.error || "Er is een fout opgetreden");
      }
    } catch (err) {
      setError("Er is een onverwachte fout opgetreden");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Voertuig toevoegen</h1>
        <p className="text-muted-foreground">
          Voeg een nieuw voertuig toe aan je garage
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voertuiggegevens</CardTitle>
          <CardDescription>
            Voer de gegevens van je voertuig in. Voor Nederlandse kentekens halen we automatisch extra details op via RDW.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="naamVoertuig">Naam voertuig (optioneel)</Label>
              <Input
                id="naamVoertuig"
                name="naamVoertuig"
                type="text"
                placeholder="Bijv. Bedrijfsauto, Bestelbusje"
                disabled={isLoading}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Geef je voertuig een herkenbare naam. Dit veld is optioneel.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licensePlate">Kentekenplaat *</Label>
              <Input
                id="licensePlate"
                name="licensePlate"
                type="text"
                placeholder="XX-XX-XX of XXXXXX"
                required
                disabled={isLoading}
                className="uppercase font-mono text-lg"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Voer het kenteken in met of zonder streepjes. We formatteren het automatisch.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type voertuig *</Label>
              <Select name="type" defaultValue="Auto" required disabled={isLoading}>
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
              <p className="text-xs text-muted-foreground">
                Welk type voertuig is dit?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="land">Land *</Label>
              <Select name="land" defaultValue="Nederland" required disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nederland">Nederland</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Op dit moment worden alleen Nederlandse voertuigen ondersteund.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilometerstandTracking">Kilometerstand bijhouden (optioneel)</Label>
              <Select name="kilometerstandTracking" defaultValue="niet_registreren" disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer frequentie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niet_registreren">Kilometerstand niet registreren</SelectItem>
                  <SelectItem value="dagelijks">Vraag het me dagelijks</SelectItem>
                  <SelectItem value="wekelijks">Vraag het me wekelijks</SelectItem>
                  <SelectItem value="maandelijks">Vraag het me maandelijks</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Hoe vaak wil je herinnerd worden om je kilometerstand bij te werken?
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isMain">Als hoofdvoertuig gebruiken</Label>
                  <p className="text-xs text-muted-foreground">
                    {vehicleCount === 0
                      ? "Je eerste voertuig wordt automatisch je hoofdvoertuig"
                      : "Maak dit je standaard voertuig voor nieuwe ritten"}
                  </p>
                </div>
                <Switch
                  id="isMain"
                  checked={isMainVehicle}
                  onCheckedChange={setIsMainVehicle}
                  disabled={vehicleCount === 0 || isLoading}
                />
              </div>
              {/* Hidden input to submit the switch value with the form */}
              <input type="hidden" name="isMain" value={isMainVehicle ? "true" : "false"} />
            </div>

            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium text-sm mb-2">Meer informatie</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {vehicleCount === 0 && (
                  <li>• Je eerste voertuig wordt automatisch je hoofdvoertuig</li>
                )}
                {vehicleCount !== null && vehicleCount > 0 && (
                  <li>• Je kunt later je hoofdvoertuig wijzigen in de garage</li>
                )}
                <li>• Verplichte velden zijn gemarkeerd met een *</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Bezig met toevoegen..." : "Voertuig toevoegen"}
              </Button>
              <Button type="button" variant="outline" asChild disabled={isLoading}>
                <Link href="/garage">Annuleren</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
