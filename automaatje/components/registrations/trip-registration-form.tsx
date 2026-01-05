"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
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
import { Loader2, MapPin, Calculator, Info, Clock, Car, ArrowRight } from "lucide-react";
import { createRegistration } from "@/lib/actions/registrations";
import { AddressAutocomplete, type AddressSuggestion, type Location } from "@/components/ui/address-autocomplete";
import { formatDutchAddress, formatDutchNumber, parseDutchNumber, formatDutchDateTime, formatDistance, formatDuration } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RouteMap } from "./route-map";
import { Badge } from "@/components/ui/badge";

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

interface LastRegistration {
  id: string;
  vehicleId: string;
  data: any;
  vehicle: Vehicle;
}

interface TripRegistrationFormProps {
  vehicles: Vehicle[];
  userHomeAddress?: Location;
  favoriteLocations?: Location[];
  previousLocations?: Location[];
  lastRegistration?: LastRegistration | null;
  isAutoCalculateMode?: boolean;
}

export function TripRegistrationForm({
  vehicles,
  userHomeAddress,
  favoriteLocations = [],
  previousLocations = [],
  lastRegistration,
  isAutoCalculateMode = false,
}: TripRegistrationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
  } | null>(null);

  // Get last odometer and vehicle
  const lastData = lastRegistration?.data;
  // Smart odometer calculation: use end if available, or calculate from start + distance, or fall back to start
  const lastOdometer = lastData?.endOdometerKm || lastData?.calculatedEndOdometer || (lastData?.startOdometerKm && lastData?.distanceKm ? lastData.startOdometerKm + lastData.distanceKm : lastData?.startOdometerKm);
  const lastVehicleId = lastRegistration?.vehicleId;
  const lastDestination = lastData?.destination;

  // Find the main vehicle (hoofdvoertuig)
  const mainVehicle = vehicles.find(v => v.details.isMain);
  const defaultVehicleId = lastVehicleId || mainVehicle?.id || "";

  // Form state - initialize with smart defaults
  const [selectedVehicle, setSelectedVehicle] = useState<string>(defaultVehicleId);
  const [timestamp, setTimestamp] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [startOdometer, setStartOdometer] = useState(lastOdometer ? Math.round(lastOdometer).toString() : "");
  const [endOdometer, setEndOdometer] = useState("");
  const [tripType, setTripType] = useState<"zakelijk" | "privé">("zakelijk");

  // Departure address - start from last destination or home
  const defaultDeparture = lastDestination?.text || userHomeAddress?.text || "";
  const defaultDepartureLat = lastDestination?.lat || userHomeAddress?.lat;
  const defaultDepartureLon = lastDestination?.lon || userHomeAddress?.lon;

  const [departureText, setDepartureText] = useState(defaultDeparture);
  const [departureLat, setDepartureLat] = useState<number | undefined>(defaultDepartureLat);
  const [departureLon, setDepartureLon] = useState<number | undefined>(defaultDepartureLon);

  // Destination address
  const [destinationText, setDestinationText] = useState("");
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLon, setDestinationLon] = useState<number | undefined>();

  // Optional fields
  const [description, setDescription] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [alternativeRoute, setAlternativeRoute] = useState("");
  const [privateDetourKm, setPrivateDetourKm] = useState("");

  // Validation warnings for unusual values
  const distanceWarning = useMemo(() => {
    if (!distanceKm) return null;
    const parsed = parseDutchNumber(distanceKm);
    if (isNaN(parsed)) return null;
    if (parsed > 500) return "Dit is een ongebruikelijk lange afstand (> 500 km). Controleer of dit correct is.";
    if (parsed < 0.1 && parsed > 0) return "Dit is een zeer korte afstand (< 100 meter). Controleer of dit correct is.";
    if (parsed < 0) return "Afstand kan niet negatief zijn.";
    return null;
  }, [distanceKm]);

  const privateDetourWarning = useMemo(() => {
    if (!privateDetourKm || !distanceKm) return null;
    const parsedDetour = parseDutchNumber(privateDetourKm);
    const parsedTotal = parseDutchNumber(distanceKm);
    if (isNaN(parsedDetour) || isNaN(parsedTotal)) return null;
    if (parsedDetour < 0) return "Privé kilometers kunnen niet negatief zijn.";
    if (parsedDetour > parsedTotal) return "Privé kilometers kunnen niet meer zijn dan de totale afstand.";
    if (parsedDetour > 100) return "Dit is een ongebruikelijk grote privé omrijding. Controleer of dit correct is.";
    return null;
  }, [privateDetourKm, distanceKm]);

  const departureCoords = useMemo(() => {
    return departureLat && departureLon
      ? { lat: departureLat, lon: departureLon }
      : undefined;
  }, [departureLat, departureLon]);

  const destinationCoords = useMemo(() => {
    return destinationLat && destinationLon
      ? { lat: destinationLat, lon: destinationLon }
      : undefined;
  }, [destinationLat, destinationLon]);

  // Calculated distance from odometer
  const calculatedOdometerDistance = endOdometer && startOdometer
    ? parseInt(endOdometer) - parseInt(startOdometer)
    : null;

  // Auto-update distance from odometer
  useEffect(() => {
    if (calculatedOdometerDistance && calculatedOdometerDistance > 0) {
      setDistanceKm(formatDutchNumber(calculatedOdometerDistance, 1));
      setRouteInfo(null); // Clear OSRM info when using odometer
    }
  }, [calculatedOdometerDistance]);

  // Automatic OSRM calculation when both addresses are set
  useEffect(() => {
    const calculateDistance = async () => {
      // Only calculate if we have coordinates and no end odometer
      if (!departureLat || !departureLon || !destinationLat || !destinationLon || endOdometer) {
        return;
      }

      setIsCalculating(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          fromLat: departureLat.toString(),
          fromLon: departureLon.toString(),
          toLat: destinationLat.toString(),
          toLon: destinationLon.toString(),
        });

        const response = await fetch(`/api/osrm/calculate?${params}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          console.error("OSRM calculation failed:", result.error);
          return;
        }

        // Set calculated distance with Dutch formatting
        setDistanceKm(formatDutchNumber(result.data.distanceKm, 1));
        setRouteInfo({
          distanceKm: result.data.distanceKm,
          durationMinutes: result.data.durationMinutes,
          geometry: result.data.geometry,
        });
      } catch (err) {
        console.error("Distance calculation error:", err);
      } finally {
        setIsCalculating(false);
      }
    };

    // Debounce the calculation
    const timer = setTimeout(calculateDistance, 500);
    return () => clearTimeout(timer);
  }, [departureLat, departureLon, destinationLat, destinationLon, endOdometer]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isPending) {
      setError("Bezig met opslaan, even geduld...");
      return;
    }

    setError(null);

    // Validate required fields
    if (!selectedVehicle) {
      setError("Selecteer een voertuig");
      return;
    }
    if (!departureText) {
      setError("Vertrekadres is verplicht");
      return;
    }
    if (!destinationText) {
      setError("Aankomstadres is verplicht");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("vehicleId", selectedVehicle);
      formData.append("timestamp", timestamp);

      // For auto-calculate mode, send 0 to trigger backend calculation
      if (isAutoCalculateMode) {
        formData.append("startOdometerKm", "0");
      } else {
        formData.append("startOdometerKm", startOdometer);
        if (endOdometer) formData.append("endOdometerKm", endOdometer);
      }

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

      startTransition(async () => {
        try {
          const result = await createRegistration(formData);

          if (!result.success) {
            setError(result.error || "Er is een fout opgetreden bij het opslaan");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }

          // Success - redirect to overview
          router.push("/registraties/overzicht");
          router.refresh();
        } catch (err) {
          console.error("Registration submission error:", err);
          setError("Er is een onverwachte fout opgetreden. Probeer het opnieuw.");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    } catch (err) {
      console.error("Form validation error:", err);
      setError("Er is een fout opgetreden bij het valideren van de gegevens");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Form */}
      <div className="space-y-4 lg:space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Last Registration Info */}
        {lastRegistration && (
          <Card className="bg-secondary hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Laatste registratie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Voertuig:</span>
                <span className="font-medium">
                  {lastRegistration.vehicle.licensePlate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kilometerstand:</span>
                <span className="font-medium">
                  {Math.round(lastOdometer || 0).toLocaleString('nl-NL')} km
                </span>
              </div>
              {lastDestination && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Locatie:</span>
                  <span className="font-medium text-right">{lastDestination.text}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tijdstip:</span>
                <span className="font-medium">
                  {formatDutchDateTime(new Date(lastData.timestamp))}
                </span>
              </div>
              {lastData.distanceKm && !lastData.endOdometerKm && (
                <div className="pt-2 border-t">
                  <Badge variant="secondary">
                    <Info className="h-3 w-3 mr-1" />
                    Berekend: {formatDistance(lastData.distanceKm)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle} required>
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Selecteer voertuig" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <span className="flex items-center gap-2">
                          {vehicle.licensePlate}
                          {vehicle.id === lastVehicleId && (
                            <Badge variant="secondary" className="text-xs">Laatste</Badge>
                          )}
                        </span>
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
                <Select value={tripType} onValueChange={(value: any) => setTripType(value)} required>
                  <SelectTrigger id="tripType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zakelijk">Zakelijk</SelectItem>
                    <SelectItem value="privé">Privé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Odometer Readings */}
          {!isAutoCalculateMode ? (
            <Card>
              <CardHeader className="pb-3 lg:pb-6">
                <CardTitle className="text-base lg:text-lg">Kilometerstand</CardTitle>
                <CardDescription className="text-sm">Begin- en eindstand van de rit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startOdometer">Beginstand (km) *</Label>
                    <Input
                      id="startOdometer"
                      type="text"
                      inputMode="numeric"
                      value={startOdometer}
                      onChange={(e) => setStartOdometer(e.target.value)}
                      placeholder="bijv. 45000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endOdometer">Eindstand (km)</Label>
                    <Input
                      id="endOdometer"
                      type="text"
                      inputMode="numeric"
                      value={endOdometer}
                      onChange={(e) => setEndOdometer(e.target.value)}
                      placeholder="bijv. 45125"
                    />
                  </div>
                </div>

                {calculatedOdometerDistance && calculatedOdometerDistance > 0 && (
                  <Alert>
                    <Calculator className="h-4 w-4" />
                    <AlertDescription>
                      Afstand volgens teller: {formatDistance(calculatedOdometerDistance)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert className="hidden">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Kilometerstand wordt automatisch berekend</p>
                  <p className="text-sm text-muted-foreground">
                    Je hebt automatisch berekenen ingeschakeld. De begin- en eindstand worden
                    automatisch bepaald op basis van je periodieke kilometerstand aflezingen.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Addresses */}
          <Card>
            <CardHeader className="pb-3 lg:pb-6">
              <CardTitle className="text-base lg:text-lg">Route</CardTitle>
              <CardDescription className="text-sm">Vertrek- en aankomstadres</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              {/* Departure Address */}
              <div className="space-y-2">
                <Label htmlFor="departure">Vertrekadres *</Label>
                <AddressAutocomplete
                  value={departureText}
                  onChange={setDepartureText}
                  onSelect={handleDepartureSelect}
                  placeholder="bijv. Hooigracht 10, Leiden"
                  onlyOpenDropdownOnUserInput={true}
                  showCurrentLocation={true}
                  homeAddress={userHomeAddress}
                  favoriteLocations={favoriteLocations}
                  previousLocations={previousLocations}
                  maxPreviousLocations={5}
                />
              </div>

              {/* Destination Address */}
              <div className="space-y-2">
                <Label htmlFor="destination">Aankomstadres *</Label>
                <AddressAutocomplete
                  value={destinationText}
                  onChange={setDestinationText}
                  onSelect={handleDestinationSelect}
                  placeholder="bijv. Coolsingel 40, Rotterdam"
                  showCurrentLocation={true}
                  homeAddress={userHomeAddress}
                  favoriteLocations={favoriteLocations}
                  previousLocations={previousLocations}
                  maxPreviousLocations={5}
                />
              </div>

              {/* Auto-calculated Distance Info */}
              {isCalculating && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>Afstand berekenen...</AlertDescription>
                </Alert>
              )}

              {routeInfo && !isCalculating && (
                <Alert className="bg-accent">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-accent-foreground">
                    Automatisch berekend: {formatDistance(routeInfo.distanceKm)} ({formatDuration(routeInfo.durationMinutes)})
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual Distance Override */}
              <div className="space-y-2">
                <Label htmlFor="distanceKm">
                  Afstand (km)
                  {!endOdometer && routeInfo && <span className="text-xs text-muted-foreground ml-2">(automatisch berekend)</span>}
                </Label>
                <Input
                  id="distanceKm"
                  type="text"
                  inputMode="decimal"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="bijv. 125,5"
                  className={distanceWarning ? "border-yellow-500" : ""}
                />
                {distanceWarning && (
                  <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/10">
                    <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      {distanceWarning}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Optional Details */}
          <Card>
            <CardHeader className="pb-3 lg:pb-6">
              <CardTitle className="text-base lg:text-lg">Aanvullende gegevens</CardTitle>
              <CardDescription className="text-sm">Optionele velden voor extra informatie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Omschrijving</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="bijv. Klantbezoek, vergadering, etc."
                  rows={3}
                />
              </div>

              {/* Alternative Route */}
              <div className="space-y-2">
                <Label htmlFor="alternativeRoute">Alternatieve route</Label>

                <Input
                  id="alternativeRoute"
                  value={alternativeRoute}
                  onChange={(e) => setAlternativeRoute(e.target.value)}
                  placeholder="bijv. Via A12 i.p.v. A4 vanwege file"
                />
              </div>

              {/* Private Detour KM */}
              <div className="space-y-2">
                <Label htmlFor="privateDetourKm">Privé omrijkilometers</Label>
                <Input
                  id="privateDetourKm"
                  type="text"
                  inputMode="decimal"
                  value={privateDetourKm}
                  onChange={(e) => setPrivateDetourKm(e.target.value)}
                  placeholder="bijv. 15,5"
                  className={privateDetourWarning ? "border-yellow-500" : ""}
                />
                {privateDetourWarning && (
                  <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/10">
                    <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      {privateDetourWarning}
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-muted-foreground">
                  Kilometers afgelegd voor privédoeleinden tijdens de zakelijke rit{distanceKm && ` van ${distanceKm} km`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button - Sticky on mobile */}
          <div className="lg:hidden h-16" /> {/* Spacer for fixed button on mobile */}
          <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:p-0 z-10">
            <div className="flex gap-3 lg:gap-4 lg:mb-4 max-w-2xl mx-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
                className="flex-1 lg:flex-none h-12 lg:h-10"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={isPending || isCalculating}
                className="flex-[2] lg:flex-1 h-12 lg:h-10"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Rit opslaan
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Right Column - Route Map (hidden on mobile to save space) */}
      <div className="hidden lg:block lg:sticky lg:top-6 h-fit">
        <RouteMap
          departureCoords={departureCoords}
          destinationCoords={destinationCoords}
          routeGeometry={routeInfo?.geometry}
        />
      </div>
    </div>
  );
}
