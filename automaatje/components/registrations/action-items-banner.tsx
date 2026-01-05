"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Gauge, X } from "lucide-react";
import { completeRegistration } from "@/lib/actions/registrations";
import { formatDutchDateTime } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface IncompleteRegistration {
  id: string;
  data: any;
  vehicle: {
    licensePlate: string;
    details: {
      naamVoertuig?: string;
      type: string;
    };
  };
}

interface ActionItemsBannerProps {
  incompleteRegistrations: IncompleteRegistration[];
}

function IncompleteTripContent({
  registrations,
  onComplete,
}: {
  registrations: IncompleteRegistration[];
  onComplete: (id: string, odometer: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [endOdometer, setEndOdometer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (registrationId: string) => {
    if (!endOdometer) {
      setError("Vul de eindstand in");
      return;
    }

    setError(null);
    const result = await onComplete(registrationId, endOdometer);

    if (!result.success) {
      setError(result.error || "Er is een fout opgetreden");
      return;
    }

    setCompletingId(null);
    setEndOdometer("");
  };

  return (
    <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(80vh-120px)]">
      {registrations.map((reg) => (
        <Card key={reg.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {formatDutchDateTime(new Date(reg.data.timestamp))}
              </div>
              <Badge variant="outline">{reg.vehicle.licensePlate}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Van: {reg.data.departure.text}</div>
              <div>Naar: {reg.data.destination.text}</div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4" />
              <span>Beginstand: {reg.data.startOdometerKm.toLocaleString("nl-NL")} km</span>
            </div>
            {completingId === reg.id ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`end-${reg.id}`}>Eindstand (km)</Label>
                  <Input
                    id={`end-${reg.id}`}
                    type="number"
                    value={endOdometer}
                    onChange={(e) => setEndOdometer(e.target.value)}
                    placeholder={`> ${reg.data.startOdometerKm}`}
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleComplete(reg.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Opslaan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCompletingId(null);
                      setEndOdometer("");
                      setError(null);
                    }}
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCompletingId(reg.id)}
                className="w-full"
              >
                Eindstand toevoegen
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ActionItemsBanner({ incompleteRegistrations: initial }: ActionItemsBannerProps) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState(initial);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleComplete = async (registrationId: string, odometer: string) => {
    const result = await completeRegistration(registrationId, parseInt(odometer));
    if (result.success) {
      setRegistrations(registrations.filter((r) => r.id !== registrationId));
      if (registrations.length === 1) {
        setIsOpen(false); // Close dialog/sheet when last item is completed
      }
      router.refresh();
    }
    return result;
  };

  if (isDismissed || registrations.length === 0) {
    return null;
  }
  
  const title = `${registrations.length} ${
    registrations.length === 1 ? "rit" : "ritten"
  } te voltooien`;
  
  const description = "Voeg eindkilometerstand toe voor een sluitende registratie.";

  if (isMobile === false) { // Desktop
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <div className="flex items-center justify-between w-full">
          <div>
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                  Bekijk
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Ritten voltooien</DialogTitle>
                  <DialogDescription>
                    Voeg eindkilometerstand toe aan deze ritten.
                  </DialogDescription>
                </DialogHeader>
                <IncompleteTripContent
                  registrations={registrations}
                  onComplete={handleComplete}
                />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Alert>
    );
  }
  
  // Mobile or initial render
  return (
    <Alert>
       <AlertCircle className="h-4 w-4" />
      <div className="flex items-center justify-between w-full">
        <div>
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </div>
        <div className="flex items-center gap-4">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm">
                  Bekijk
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Ritten voltooien</SheetTitle>
                  <SheetDescription>
                    Voeg eindkilometerstand toe aan deze ritten.
                  </SheetDescription>
                </SheetHeader>
                <IncompleteTripContent
                  registrations={registrations}
                  onComplete={handleComplete}
                />
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </Alert>
  );
}
