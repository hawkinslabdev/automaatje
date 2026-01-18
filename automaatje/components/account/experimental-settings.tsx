"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, FlaskConical } from "lucide-react";
import { updateExperimentalSettings } from "@/lib/actions/user-settings";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExperimentalSettingsProps {
  user: {
    id: string;
    metadata?: any;
  };
}

export function ExperimentalSettings({ user }: ExperimentalSettingsProps) {
  const router = useRouter();
  const metadata = (user.metadata as any) || {};
  const experimental = metadata.preferences?.experimental || {};

  const [showPrivateDetour, setShowPrivateDetour] = useState<boolean>(
    experimental.showPrivateDetourKm ?? false
  );
  const [showLiveOnDesktop, setShowLiveOnDesktop] = useState<boolean>(
    experimental.showLiveOnDesktop ?? false // Default: disabled (opt-in)
  );
  const [detailedSimpleMode, setDetailedSimpleMode] = useState<boolean>(
    experimental.detailedSimpleMode ?? false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await updateExperimentalSettings({
        showPrivateDetourKm: showPrivateDetour,
        showLiveOnDesktop: showLiveOnDesktop,
        detailedSimpleMode: detailedSimpleMode,
      });

      if (result.success) {
        setSuccessMessage("Instellingen opgeslagen");
        router.refresh();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(result.error || "Er is een fout opgetreden");
      }
    } catch (error) {
      setErrorMessage("Er is een fout opgetreden bij het opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Experimenteel</h1>
        <p className="text-muted-foreground mt-1">
          Schakel nieuwe functies in die nog in ontwikkeling zijn
        </p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Experimentele functies
          </CardTitle>
          <CardDescription>
            Deze functies zijn in ontwikkeling en kunnen veranderen of onverwacht gedrag vertonen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature 1: Private Detour Kilometers */}
          <div className="flex items-start justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="private-detour" className="text-base font-medium">
                Toon privé omrijkilometers tijdens ritregistratie
              </Label>
              <p className="text-sm text-muted-foreground">
                Voeg een veld toe om privé omrijkilometers te registreren bij gemengde ritten (zakelijk + privé)
              </p>
            </div>
            <Switch
              id="private-detour"
              checked={showPrivateDetour}
              onCheckedChange={setShowPrivateDetour}
            />
          </div>

          <div className="border-t" />

          {/* Feature 2: Live Registration on Desktop */}
          <div className="flex items-start justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="live-desktop" className="text-base font-medium">
                Toon live ritregistratie op desktop
              </Label>
              <p className="text-sm text-muted-foreground">
                Voeg de live GPS ritregistratie toe aan de navigatie op desktop (standaard alleen mobiel)
              </p>
            </div>
            <Switch
              id="live-desktop"
              checked={showLiveOnDesktop}
              onCheckedChange={setShowLiveOnDesktop}
            />
          </div>

          <div className="border-t" />

          {/* Feature 3: Detailed Simple Mode */}
          <div className="flex items-start justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="detailed-simple" className="text-base font-medium">
                Uitgebreide woon-werk registratie
              </Label>
              <p className="text-sm text-muted-foreground">
                Toon vertrek- en bestemmingsadressen bij eenvoudige kilometervergoeding, met automatische afstandsberekening. Handig voor ritten buiten je vaste woon-werkverkeer.
              </p>
            </div>
            <Switch
              id="detailed-simple"
              checked={detailedSimpleMode}
              onCheckedChange={setDetailedSimpleMode}
            />
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
