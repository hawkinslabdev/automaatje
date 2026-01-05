"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Gauge, MapPin, Clock, ArrowRight } from "lucide-react";
import { LightbulbIcon } from "@/components/ui/lightbulb-icon";
import { completeRegistration } from "@/lib/actions/registrations";
import { formatDutchDateTime, formatDistance } from "@/lib/utils";

interface CompleteLastTripPromptProps {
  registration: {
    id: string;
    vehicleId: string;
    data: any;
    vehicle: {
      licensePlate: string;
      details: {
        naamVoertuig?: string;
        type: string;
      };
    };
  };
}

export function CompleteLastTripPrompt({ registration }: CompleteLastTripPromptProps) {
  const router = useRouter();
  const [endOdometer, setEndOdometer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = registration.data;
  const suggestedEndOdometer = data.calculatedEndOdometer || (data.startOdometerKm + (data.distanceKm || 0));

  const handleSkip = () => {
    router.push("/registraties/nieuw?skipLastTrip=true");
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!endOdometer) {
      setError("Vul de eindstand in");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await completeRegistration(registration.id, parseInt(endOdometer));

    if (!result.success) {
      setError(result.error || "Er is een fout opgetreden");
      setIsSubmitting(false);
      return;
    }

    // Refresh the page to show the form
    router.refresh();
  };

  const handleUseSuggested = () => {
    setEndOdometer(Math.round(suggestedEndOdometer).toString());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Last Trip Details */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Laatste rit voltooien</CardTitle>
                <CardDescription>Voltooi eerst je laatste rit voordat je een nieuwe registreert</CardDescription>
              </div>
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Onvolledig
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trip Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {formatDutchDateTime(new Date(data.timestamp))}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{registration.vehicle.licensePlate}</Badge>
                  <span className="text-muted-foreground">
                    {registration.vehicle.details.naamVoertuig || registration.vehicle.details.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Beginstand: <span className="font-medium">{data.startOdometerKm.toLocaleString("nl-NL")} km</span>
                  </span>
                </div>
                {data.distanceKm && (
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Afstand: <span className="font-medium">{formatDistance(data.distanceKm)}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Van:</span>
                  <span className="font-medium">{data.departure.text}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Naar:</span>
                  <span className="font-medium">{data.destination.text}</span>
                </div>
              </div>
            </div>

            {/* Complete Form */}
            <form onSubmit={handleComplete} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endOdometer">Eindstand kilometerstand *</Label>
                <div className="flex gap-2">
                  <Input
                    id="endOdometer"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={endOdometer}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setEndOdometer(value);
                    }}
                    placeholder={`bijv. ${Math.round(suggestedEndOdometer)}`}
                    required
                    className="flex-1"
                    autoFocus
                  />
                  {data.distanceKm && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseSuggested}
                      disabled={isSubmitting}
                    >
                      Automatisch invullen
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.distanceKm
                    ? `Verwacht: ongeveer ${Math.round(suggestedEndOdometer).toLocaleString("nl-NL")} km (beginstand + ${formatDistance(data.distanceKm)})`
                    : `Moet hoger zijn dan ${data.startOdometerKm.toLocaleString("nl-NL")} km`}
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Overslaan
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>Bezig met opslaan...</>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Rit voltooien
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        {/* Help Text */}
        <Card className="bg-secondary">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <LightbulbIcon />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Waarom moet ik dit voltooien?
                </p>
                <p className="text-xs text-muted-foreground">
                  Om nauwkeurige kilometerregistratie te garanderen, moet je de vorige rit eerst voltooien voordat je een nieuwe kunt beginnen. Dit voorkomt fouten en zorgt ervoor dat alle ritten correct worden geregistreerd.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
