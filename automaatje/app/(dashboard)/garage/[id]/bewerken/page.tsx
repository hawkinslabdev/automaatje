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
import { getUserVehicles, updateVehicle } from "@/lib/actions/vehicles";
import { Loader2 } from "lucide-react";

export default function BewerkenVoertuigPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingVehicle, setIsFetchingVehicle] = useState(true);
  const [vehicle, setVehicle] = useState<any>(null);
  const [isMainVehicle, setIsMainVehicle] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setVehicleId(resolvedParams.id);
    }
    unwrapParams();
  }, [params]);

  // Fetch vehicle on mount
  useEffect(() => {
    if (!vehicleId) return;

    async function fetchVehicle() {
      const result = await getUserVehicles();
      if (result.success && result.data) {
        const found = result.data.find((v: any) => v.id === vehicleId);
        if (found) {
          setVehicle(found);
          const details = found.details as any;
          setIsMainVehicle(details.isMain || false);
        } else {
          setError("Voertuig niet gevonden");
        }
      } else {
        setError("Kon voertuig niet laden");
      }
      setIsFetchingVehicle(false);
    }
    fetchVehicle();
  }, [vehicleId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicleId) return;

    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await updateVehicle(vehicleId, formData);

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

  if (isFetchingVehicle) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Voertuig niet gevonden</h1>
          <p className="text-muted-foreground">Dit voertuig bestaat niet of je hebt geen toegang.</p>
        </div>
        <Button asChild>
          <Link href="/garage">Terug naar garage</Link>
        </Button>
      </div>
    );
  }

  const details = vehicle.details as any;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Voertuig bewerken</h1>
        <p className="text-muted-foreground">
          Pas de gegevens van je voertuig aan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voertuiggegevens</CardTitle>
          <CardDescription>
            Wijzig de gegevens van je voertuig. Als je het kenteken aanpast, halen we automatisch nieuwe details op via RDW.
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
                defaultValue={details.naamVoertuig || ""}
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
                defaultValue={vehicle.licensePlate}
                className="uppercase font-mono text-lg"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Voer het kenteken in met of zonder streepjes. We formatteren het automatisch.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type voertuig *</Label>
              <Select name="type" defaultValue={details.type} required disabled={isLoading}>
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
              <Select name="land" defaultValue={details.land || "Nederland"} required disabled>
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
              <Select name="kilometerstandTracking" defaultValue={details.kilometerstandTracking} disabled={isLoading}>
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
                    Maak dit je standaard voertuig voor nieuwe ritten
                  </p>
                </div>
                <Switch
                  id="isMain"
                  checked={isMainVehicle}
                  onCheckedChange={setIsMainVehicle}
                  disabled={isLoading}
                />
              </div>
              {/* Hidden input to submit the switch value with the form */}
              <input type="hidden" name="isMain" value={isMainVehicle ? "true" : "false"} />
            </div>

            {details.detailsStatus === "READY" && details.make && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium text-sm mb-2">RDW gegevens</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Merk: {details.make}</p>
                  <p>Model: {details.model}</p>
                  {details.year && <p>Bouwjaar: {details.year}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Bezig met opslaan..." : "Wijzigingen opslaan"}
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
