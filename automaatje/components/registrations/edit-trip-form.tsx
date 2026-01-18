"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Calculator, X } from "lucide-react";
import { updateRegistration } from "@/lib/actions/registrations";
import { AddressAutocomplete, type AddressSuggestion, type Location } from "@/components/ui/address-autocomplete";
import { formatDutchNumber, parseDutchNumber, formatDistance, formatDuration, formatDutchAddress } from "@/lib/utils";
import { RouteMap } from "./route-map";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
  id: string;
  licensePlate: string;
  details: {
    naamVoertuig?: string;
    type: string;
    make?: string;
    model?: string;
    isMain?: boolean;
  };
}

interface Registration {
  id: string;
  vehicleId: string;
  data: any;
  vehicle: Vehicle;
}

interface EditTripFormProps {
  registration: Registration;
  vehicles: Vehicle[];
  userHomeAddress?: Location;
  favoriteLocations?: Location[];
  previousLocations?: Location[];
}

export function EditTripForm({
  registration,
  vehicles,
  userHomeAddress,
  favoriteLocations = [],
  previousLocations = [],
}: EditTripFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
  } | null>(null);

  const registrationData = registration.data;

  // Initialize form state with existing data
  const [selectedVehicle, setSelectedVehicle] = useState<string>(registration.vehicleId);
  const [timestamp, setTimestamp] = useState(() => {
    const date = new Date(registrationData.timestamp);
    return date.toISOString().slice(0, 16);
  });
  const [startOdometer, setStartOdometer] = useState(
    registrationData.startOdometerKm ? registrationData.startOdometerKm.toString() : ""
  );
  const [endOdometer, setEndOdometer] = useState(
    registrationData.endOdometerKm ? registrationData.endOdometerKm.toString() : ""
  );
  const [tripType, setTripType] = useState<"zakelijk" | "privé" | "woon-werk">(registrationData.tripType || "zakelijk");

  const [departureText, setDepartureText] = useState(registrationData.departure?.text || "");
  const [departureLat, setDepartureLat] = useState<number | undefined>(registrationData.departure?.lat);
  const [departureLon, setDepartureLon] = useState<number | undefined>(registrationData.departure?.lon);

  const [destinationText, setDestinationText] = useState(registrationData.destination?.text || "");
  const [destinationLat, setDestinationLat] = useState<number | undefined>(registrationData.destination?.lat);
  const [destinationLon, setDestinationLon] = useState<number | undefined>(registrationData.destination?.lon);

  const [distanceKm, setDistanceKm] = useState(
    registrationData.distanceKm ? formatDutchNumber(registrationData.distanceKm) : ""
  );
  const [description, setDescription] = useState(registrationData.description || "");
  const [alternativeRoute, setAlternativeRoute] = useState(registrationData.alternativeRoute || "");
  const [privateDetourKm, setPrivateDetourKm] = useState(
    registrationData.privateDetourKm ? formatDutchNumber(registrationData.privateDetourKm) : ""
  );

  // Address suggestion handlers (same as TripRegistrationForm)
  const handleDepartureSelect = (suggestion: AddressSuggestion | Location) => {
    if ('displayName' in suggestion) {
      // AddressSuggestion from Nominatim search
      const formattedAddress = formatDutchAddress(suggestion.address);
      setDepartureText(formattedAddress);
      setDepartureLat(suggestion.lat);
      setDepartureLon(suggestion.lon);
    } else {
      // Location (home, favorite, previous, or GPS)
      setDepartureText(suggestion.text);
      setDepartureLat(suggestion.lat);
      setDepartureLon(suggestion.lon);
    }
  };

  const handleDestinationSelect = (suggestion: AddressSuggestion | Location) => {
    if ('displayName' in suggestion) {
      // AddressSuggestion from Nominatim search
      const formattedAddress = formatDutchAddress(suggestion.address);
      setDestinationText(formattedAddress);
      setDestinationLat(suggestion.lat);
      setDestinationLon(suggestion.lon);
    } else {
      // Location (home, favorite, previous, or GPS)
      setDestinationText(suggestion.text);
      setDestinationLat(suggestion.lat);
      setDestinationLon(suggestion.lon);
    }
  };

  // Calculate distance using OSRM
  const calculateDistance = async () => {
    if (!departureLat || !departureLon || !destinationLat || !destinationLon) {
      toast({
        variant: "destructive",
        title: "Fout bij afstandsberekening",
        description: "Selecteer eerst vertrek- en aankomstadressen met coördinaten",
      });
      return;
    }

    setIsCalculating(true);

    try {
      const response = await fetch(
        `/api/osrm/calculate?fromLat=${departureLat}&fromLon=${departureLon}&toLat=${destinationLat}&toLon=${destinationLon}`
      );

      if (!response.ok) {
        throw new Error("Kon afstand niet berekenen");
      }

      const data = await response.json();

      setRouteInfo({
        distanceKm: data.distanceKm,
        durationMinutes: data.durationMinutes,
        geometry: data.geometry,
      });

      setDistanceKm(formatDutchNumber(data.distanceKm));
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fout bij afstandsberekening",
        description: "Kon afstand niet berekenen. Probeer het opnieuw of voer handmatig in.",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate distance when addresses change
  useEffect(() => {
    if (departureLat && departureLon && destinationLat && destinationLon) {
      const timer = setTimeout(() => {
        calculateDistance();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [departureLat, departureLon, destinationLat, destinationLon]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isPending) {
      return;
    }

    // Validate required fields
    if (!selectedVehicle) {
      toast({
        variant: "destructive",
        title: "Validatiefout",
        description: "Selecteer een voertuig",
      });
      return;
    }
    if (!departureText) {
      toast({
        variant: "destructive",
        title: "Validatiefout",
        description: "Vertrekadres is verplicht",
      });
      return;
    }
    if (!destinationText) {
      toast({
        variant: "destructive",
        title: "Validatiefout",
        description: "Aankomstadres is verplicht",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("vehicleId", selectedVehicle);
      formData.append("timestamp", timestamp);
      formData.append("startOdometerKm", startOdometer);
      if (endOdometer) formData.append("endOdometerKm", endOdometer);
      formData.append("tripType", tripType);

      // Departure
      formData.append("departureText", departureText);
      if (departureLat) formData.append("departureLat", departureLat.toString());
      if (departureLon) formData.append("departureLon", departureLon.toString());

      // Destination
      formData.append("destinationText", destinationText);
      if (destinationLat) formData.append("destinationLat", destinationLat.toString());
      if (destinationLon) formData.append("destinationLon", destinationLon.toString());

      // Parse distance (convert Dutch comma to dot)
      if (distanceKm) {
        const parsedDistance = parseDutchNumber(distanceKm);
        formData.append("distanceKm", parsedDistance.toString());
      }
      if (description) formData.append("description", description);
      if (alternativeRoute) formData.append("alternativeRoute", alternativeRoute);
      if (privateDetourKm) {
        const parsedDetour = parseDutchNumber(privateDetourKm);
        formData.append("privateDetourKm", parsedDetour.toString());
      }

      // Set calculation method
      if (endOdometer) {
        formData.append("calculationMethod", "odometer");
      } else if (routeInfo) {
        formData.append("calculationMethod", "osrm");
      } else if (distanceKm) {
        formData.append("calculationMethod", "manual");
      }

      // Preserve linked trip data
      if (registrationData.linkedTripId) {
        formData.append("linkedTripId", registrationData.linkedTripId);
      }
      if (registrationData.tripDirection) {
        formData.append("tripDirection", registrationData.tripDirection);
      }

      startTransition(async () => {
        try {
          const result = await updateRegistration(registration.id, formData);

          if (!result.success) {
            toast({
              variant: "destructive",
              title: "Fout bij opslaan",
              description: result.error || "Er is een fout opgetreden bij het opslaan",
            });
            return;
          }

          // Success - show toast and redirect
          toast({
            title: "Registratie bijgewerkt",
            description: "De wijzigingen zijn succesvol opgeslagen",
          });

          router.push("/registraties/overzicht");
          router.refresh();
        } catch (err) {
          console.error("Registration update error:", err);
          toast({
            variant: "destructive",
            title: "Onverwachte fout",
            description: "Er is een onverwachte fout opgetreden. Probeer het opnieuw.",
          });
        }
      });
    } catch (err) {
      console.error("Form validation error:", err);
      toast({
        variant: "destructive",
        title: "Validatiefout",
        description: "Er is een fout opgetreden bij het valideren van de gegevens",
      });
    }
  };

  const handleCancel = () => {
    router.push("/registraties/overzicht");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Form */}
      <div className="space-y-4 lg:space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          {/* Basic Trip Info */}
          <Card>
            <CardHeader className="pb-3 lg:pb-6">
              <CardTitle className="text-base lg:text-lg">Ritgegevens</CardTitle>
              <CardDescription className="text-sm">Basisinformatie over de rit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              {/* Vehicle Selection */}
              <div className="space-y-2">
                <Label htmlFor="vehicle">Voertuig *</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Selecteer voertuig" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.licensePlate}
                        {vehicle.details.naamVoertuig && ` - ${vehicle.details.naamVoertuig}`}
                        {vehicle.details.isMain && " (hoofdvoertuig)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Timestamp */}
              <div className="space-y-2">
                <Label htmlFor="timestamp">Tijdstip *</Label>
                <Input
                  id="timestamp"
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  required
                />
              </div>

              {/* Trip Type */}
              <div className="space-y-2">
                <Label htmlFor="tripType">Rittype *</Label>
                <Select value={tripType} onValueChange={(value) => setTripType(value as "zakelijk" | "privé" | "woon-werk")}>
                  <SelectTrigger id="tripType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zakelijk">Zakelijk</SelectItem>
                    <SelectItem value="woon-werk">Woon-werk</SelectItem>
                    <SelectItem value="privé">Privé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Odometer Readings */}
          <Card>
            <CardHeader className="pb-3 lg:pb-6">
              <CardTitle className="text-base lg:text-lg">Kilometerstand</CardTitle>
              <CardDescription className="text-sm">Begin- en eindstand van de teller</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startOdometer">Beginstand (km) *</Label>
                  <Input
                    id="startOdometer"
                    type="number"
                    value={startOdometer}
                    onChange={(e) => setStartOdometer(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endOdometer">Eindstand (km)</Label>
                  <Input
                    id="endOdometer"
                    type="number"
                    value={endOdometer}
                    onChange={(e) => setEndOdometer(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Addresses */}
          <Card>
            <CardHeader className="pb-3 lg:pb-6">
              <CardTitle className="text-base lg:text-lg">Route</CardTitle>
              <CardDescription className="text-sm">
                Vertrek- en aankomstadres
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="departure">Vertrekadres *</Label>
                <AddressAutocomplete
                  value={departureText}
                  onChange={setDepartureText}
                  onSelect={handleDepartureSelect}
                  placeholder="Bijv. Kalverstraat 1, Amsterdam"
                  homeAddress={userHomeAddress}
                  favoriteLocations={favoriteLocations}
                  previousLocations={previousLocations}
                  id="departure"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Aankomstadres *</Label>
                <AddressAutocomplete
                  value={destinationText}
                  onChange={setDestinationText}
                  onSelect={handleDestinationSelect}
                  placeholder="Bijv. Leidseplein 1, Amsterdam"
                  homeAddress={userHomeAddress}
                  favoriteLocations={favoriteLocations}
                  previousLocations={previousLocations}
                  id="destination"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="distance">Afstand (km)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={calculateDistance}
                    disabled={!departureLat || !departureLon || !destinationLat || !destinationLon || isCalculating}
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Berekenen...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        Bereken afstand
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="distance"
                  type="text"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="0,0"
                />
                {routeInfo && (
                  <p className="text-xs text-muted-foreground">
                    Berekende afstand: {formatDistance(routeInfo.distanceKm)} • Geschatte duur: {formatDuration(routeInfo.durationMinutes)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Optional Details */}
          <Card>
            <CardHeader className="pb-3 lg:pb-6">
              <CardTitle className="text-base lg:text-lg">Extra informatie (optioneel)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Omschrijving</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bijv. klantbezoek, vergadering, etc."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternativeRoute">Alternatieve route</Label>
                <Input
                  id="alternativeRoute"
                  type="text"
                  value={alternativeRoute}
                  onChange={(e) => setAlternativeRoute(e.target.value)}
                  placeholder="Reden voor afwijkende route"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privateDetour">Privé-omrijkilometers</Label>
                <Input
                  id="privateDetour"
                  type="text"
                  value={privateDetourKm}
                  onChange={(e) => setPrivateDetourKm(e.target.value)}
                  placeholder="0,0"
                />
                <p className="text-xs text-muted-foreground">
                  Bij gemengde ritten: het aantal kilometers dat privé is
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 sticky bottom-4 lg:static bg-background pt-4 pb-2 lg:pb-0 z-10">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opslaan...
                </>
              ) : (
                "Wijzigingen opslaan"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              <X className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Annuleren</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Right Column - Map (desktop only) */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <RouteMap
            departureCoords={
              departureLat && departureLon
                ? { lat: departureLat, lon: departureLon }
                : undefined
            }
            destinationCoords={
              destinationLat && destinationLon
                ? { lat: destinationLat, lon: destinationLon }
                : undefined
            }
            routeGeometry={routeInfo?.geometry}
          />
        </div>
      </div>
    </div>
  );
}
