"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Calendar,
  Gauge,
  Route,
  MoreVertical,
  Trash2,
  CornerDownRight,
  Briefcase,
  Home,
  Navigation,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { deleteRegistration, createReturnJourney, completeRegistration } from "@/lib/actions/registrations";
import { formatDistance } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TripData {
  timestamp: number;
  startOdometerKm: number;
  endOdometerKm?: number;
  tripType: "zakelijk" | "privé";
  departure: { text: string; lat?: number; lon?: number };
  destination: { text: string; lat?: number; lon?: number };
  distanceKm?: number;
  description?: string;
  tripDirection?: "heenreis" | "terugreis";
  linkedTripId?: string;
  isIncomplete?: boolean;
}

interface Registration {
  id: string;
  data: TripData;
  vehicle: {
    licensePlate: string;
    details: {
      naamVoertuig?: string;
      type: string;
    };
  };
}

interface TripListProps {
  registrations: Registration[];
}

export function TripList({ registrations: initialRegistrations }: TripListProps) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingReturn, setIsCreatingReturn] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [endOdometer, setEndOdometer] = useState("");
  const [completeError, setCompleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteRegistration(deleteId);

    if (result.success) {
      // Remove from local state
      setRegistrations(registrations.filter((r) => r.id !== deleteId));
      setDeleteId(null);
      router.refresh();
    }

    setIsDeleting(false);
  };

  const handleCreateReturn = async (outwardTripId: string) => {
    setIsCreatingReturn(true);
    const result = await createReturnJourney(outwardTripId);

    if (result.success) {
      router.refresh();
    }

    setIsCreatingReturn(false);
  };

  const handleComplete = async (registrationId: string) => {
    if (!endOdometer) {
      setCompleteError("Vul de eindstand in");
      return;
    }

    setCompleteError(null);
    const result = await completeRegistration(registrationId, parseInt(endOdometer));

    if (!result.success) {
      setCompleteError(result.error || "Er is een fout opgetreden");
      return;
    }

    // Update local state
    setRegistrations(
      registrations.map((r) =>
        r.id === registrationId
          ? {
              ...r,
              data: {
                ...r.data,
                endOdometerKm: parseInt(endOdometer),
                distanceKm: parseInt(endOdometer) - r.data.startOdometerKm,
                isIncomplete: false,
              },
            }
          : r
      )
    );
    setCompletingId(null);
    setEndOdometer("");
    router.refresh();
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(timestamp));
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  };

  const getTripTypeIcon = (tripType: string) => {
    switch (tripType) {
      case "zakelijk":
        return <Briefcase className="h-4 w-4" />;
      case "privé":
        return <Home className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTripTypeBadgeVariant = (tripType: string): "default" | "secondary" | "outline" => {
    switch (tripType) {
      case "zakelijk":
        return "default";
      case "privé":
        return "secondary";
      default:
        return "secondary";
    }
  };

  if (registrations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Nog geen ritten geregistreerd</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Begin met het registreren van je zakelijke ritten
            </p>
            <Button onClick={() => router.push("/registraties/nieuw")}>
              Eerste rit registreren
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const groupedByDate: Record<string, Registration[]> = {};
  registrations.forEach((reg) => {
    const dateKey = formatDate(reg.data.timestamp);
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(reg);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, trips]) => (
        <div key={date} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {date}
          </div>

          <div className="space-y-3">
            {trips.map((trip) => (
              <Card key={trip.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Main content */}
                    <div className="flex-1 space-y-3">
                      {/* Header: Time, Vehicle, Type */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatTime(trip.data.timestamp)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {trip.vehicle.details.naamVoertuig || trip.vehicle.licensePlate}
                        </span>
                        <Badge variant={getTripTypeBadgeVariant(trip.data.tripType)}>
                          <span className="flex items-center gap-1">
                            {getTripTypeIcon(trip.data.tripType)}
                            {trip.data.tripType}
                          </span>
                        </Badge>
                        {trip.data.tripDirection === "terugreis" && (
                          <Badge variant="outline">
                            <CornerDownRight className="h-3 w-3 mr-1" />
                            terugreis
                          </Badge>
                        )}
                        {!trip.data.endOdometerKm && (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Te voltooien
                          </Badge>
                        )}
                      </div>

                      {/* Route */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 mt-0.5 text-green-600" />
                          <span>{trip.data.departure.text}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 mt-0.5 text-red-600" />
                          <span>{trip.data.destination.text}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {trip.data.description && (
                        <p className="text-sm text-muted-foreground">
                          {trip.data.description}
                        </p>
                      )}

                      {/* Metrics */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Gauge className="h-4 w-4" />
                          <span>
                            {trip.data.startOdometerKm.toLocaleString("nl-NL")}
                            {trip.data.endOdometerKm && ` → ${trip.data.endOdometerKm.toLocaleString("nl-NL")}`} km
                          </span>
                        </div>
                        {trip.data.distanceKm && (
                          <div className="flex items-center gap-1">
                            <Route className="h-4 w-4" />
                            <span>{formatDistance(trip.data.distanceKm)}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Complete for Incomplete Trips */}
                      {!trip.data.endOdometerKm && (
                        <div className="pt-3 border-t">
                          {completingId === trip.id ? (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor={`end-${trip.id}`} className="text-sm">
                                  Eindstand (km)
                                </Label>
                                <Input
                                  id={`end-${trip.id}`}
                                  type="number"
                                  value={endOdometer}
                                  onChange={(e) => setEndOdometer(e.target.value)}
                                  placeholder={`> ${trip.data.startOdometerKm}`}
                                  className="h-9"
                                />
                              </div>
                              {completeError && (
                                <p className="text-xs text-destructive">{completeError}</p>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleComplete(trip.id)}
                                  className="flex-1"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Opslaan
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCompletingId(null);
                                    setEndOdometer("");
                                    setCompleteError(null);
                                  }}
                                >
                                  Annuleren
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setCompletingId(trip.id)}
                              className="w-full"
                            >
                              <AlertCircle className="h-3 w-3 mr-2" />
                              Eindstand toevoegen
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!trip.data.linkedTripId && !trip.data.tripDirection && (
                          <DropdownMenuItem
                            onClick={() => handleCreateReturn(trip.id)}
                            disabled={isCreatingReturn}
                          >
                            <CornerDownRight className="h-4 w-4 mr-2" />
                            Terugreis maken
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeleteId(trip.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rit verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze rit wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Verwijderen..." : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
