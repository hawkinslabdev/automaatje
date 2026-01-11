"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { LiveMap } from "./live-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Navigation, AlertCircle, MapPin, Flag } from "lucide-react";
import { gpsTracker, type GPSPoint } from "@/lib/services/gps-tracker.service";
import { screenKeeper } from "@/lib/services/screen-keeper.service";
import { startLiveTrip, stopLiveTrip, getActiveLiveTrip, cancelLiveTrip, saveGPSPoints, loadGPSPoints } from "@/lib/actions/live-trips";

interface LiveTrackingScreenProps {
  vehicleId: string;
  vehicleName: string;
  activeTrip?: {
    id: string;
    startedAt: Date;
    startAddress?: string | null;
    startLat: number;
    startLon: number;
  } | null;
}

type TrackingState = "IDLE" | "REQUESTING_PERMISSION" | "STARTING" | "TRACKING" | "STOPPING" | "ERROR";

const KM_RATE = 0.23; // Nederlandse kilometervergoeding per km

export function LiveTrackingScreen({ vehicleId, vehicleName, activeTrip }: LiveTrackingScreenProps) {
  const router = useRouter();

  const [state, setState] = useState<TrackingState>(activeTrip ? "TRACKING" : "IDLE");
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(activeTrip?.id || null);

  const [points, setPoints] = useState<GPSPoint[]>([]);
  const [currentPoint, setCurrentPoint] = useState<GPSPoint | null>(null);
  const [distance, setDistance] = useState(0);

  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [showStopConfirmDialog, setShowStopConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showZeroKmDialog, setShowZeroKmDialog] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'active' | 'lost' | 'reconnecting'>('active');
  const startTimeRef = useRef<Date | null>(null);
  const lastGpsUpdateRef = useRef<number>(Date.now());
  const lastSaveTimestampRef = useRef<number>(0);
  const creatingTripRef = useRef<boolean>(false);
  const isResumingRef = useRef<boolean>(false);
  const gpsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gpsSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gpsMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Form state (during tracking)
  const [startAddress, setStartAddress] = useState<string>(activeTrip?.startAddress || "");
  const [isBusinessTrip, setIsBusinessTrip] = useState(() => {
    // Haal laatste state op uit localStorage, default naar zakelijk
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lastTripType");
      return saved === "PRIVATE" ? false : true; // Default zakelijk
    }
    return true;
  });
  const [notes, setNotes] = useState("");

  // Sla trip type op in localStorage wanneer deze wijzigt
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lastTripType", isBusinessTrip ? "BUSINESS" : "PRIVATE");
    }
  }, [isBusinessTrip]);

  // Cleanup bij unmount
  useEffect(() => {
    return () => {
      if (gpsTracker.isTracking()) {
        gpsTracker.stop();
      }
      if (screenKeeper.isActive()) {
        screenKeeper.allowScreenOff();
      }
    };
  }, []);

  // Handle visibility change voor wake lock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (state === "TRACKING") {
        screenKeeper.handleVisibilityChange();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state]);

  // Auto-resume tracking if there's an active trip
  useEffect(() => {
    if (activeTrip && !gpsTracker.isTracking() && !isResumingRef.current) {
      console.log("Auto-resuming active trip:", activeTrip.id);
      isResumingRef.current = true;
      startTimeRef.current = new Date(activeTrip.startedAt);

      // Start GPS tracking in the background
      const resumeTracking = async () => {
        setState("STARTING");

        // Activeer wake lock
        const wakeLockSuccess = await screenKeeper.keepScreenOn();
        setWakeLockActive(wakeLockSuccess);

        // Set GPS timeout (30 seconds)
        gpsTimeoutRef.current = setTimeout(() => {
          if (state === "STARTING") {
            console.error("GPS timeout during resume");
            setError("GPS signaal niet gevonden. Controleer je GPS instellingen.");
            setState("ERROR");
            gpsTracker.stop();
            if (screenKeeper.isActive()) {
              screenKeeper.allowScreenOff();
            }
          }
        }, 30000);

        // Start GPS tracker
        gpsTracker.start(
          (point) => {
            // Clear timeout on first successful point
            if (gpsTimeoutRef.current) {
              clearTimeout(gpsTimeoutRef.current);
              gpsTimeoutRef.current = null;
            }

            setCurrentPoint(point);
            setPoints((prev) => [...prev, point]);
            setDistance(gpsTracker.getTotalDistance());
            setGpsAccuracy(point.accuracy);
            lastGpsUpdateRef.current = Date.now();
          },
          (error) => {
            console.error("GPS error during resume:", error);

            // Clear timeout on error
            if (gpsTimeoutRef.current) {
              clearTimeout(gpsTimeoutRef.current);
              gpsTimeoutRef.current = null;
            }

            let errorMsg = "GPS fout";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMsg = "GPS toegang geweigerd. Geef toestemming in je browser instellingen.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg = "GPS locatie niet beschikbaar. Controleer je GPS signaal.";
                break;
              case error.TIMEOUT:
                errorMsg = "GPS timeout. Probeer opnieuw.";
                break;
            }
            setError(errorMsg);
            setState("ERROR");
            if (screenKeeper.isActive()) {
              screenKeeper.allowScreenOff();
            }
          }
        );

        setState("TRACKING");
        isResumingRef.current = false;
      };

      resumeTracking();

      // Cleanup on unmount
      return () => {
        if (gpsTimeoutRef.current) {
          clearTimeout(gpsTimeoutRef.current);
          gpsTimeoutRef.current = null;
        }
        if (gpsTracker.isTracking()) {
          console.log("Cleaning up auto-resumed GPS tracker");
          gpsTracker.stop();
        }
        if (screenKeeper.isActive()) {
          screenKeeper.allowScreenOff();
        }
        isResumingRef.current = false;
      };
    }
  }, [activeTrip]);

  // Load saved GPS points when resuming
  useEffect(() => {
    if (activeTrip && tripId) {
      const loadSavedPoints = async () => {
        const result = await loadGPSPoints(tripId);
        if (result.success && result.data.length > 0) {
          console.log(`Loaded ${result.data.length} saved GPS points`);
          gpsTracker.loadPoints(result.data);
          setPoints(result.data);
          setDistance(gpsTracker.getTotalDistance());

          // Set last save timestamp to the last loaded point
          if (result.data.length > 0) {
            lastSaveTimestampRef.current = result.data[result.data.length - 1].timestamp;
          }
        }
      };

      loadSavedPoints();
    }
  }, [activeTrip, tripId]);

  // Incremental GPS point storage (save every 30 seconds)
  useEffect(() => {
    if (state === "TRACKING" && tripId) {
      gpsSaveIntervalRef.current = setInterval(async () => {
        const newPoints = gpsTracker.getNewPoints(lastSaveTimestampRef.current);

        if (newPoints.length > 0) {
          console.log(`Saving ${newPoints.length} new GPS points to database...`);
          const result = await saveGPSPoints(tripId, newPoints);

          if (result.success) {
            console.log(`Successfully saved ${result.data.saved} GPS points`);
            // Update last save timestamp
            const lastPoint = newPoints[newPoints.length - 1];
            lastSaveTimestampRef.current = lastPoint.timestamp;
          } else {
            console.error("Failed to save GPS points:", result.error);
          }
        }
      }, 30000); // Save every 30 seconds

      return () => {
        if (gpsSaveIntervalRef.current) {
          clearInterval(gpsSaveIntervalRef.current);
          gpsSaveIntervalRef.current = null;
        }
      };
    }
  }, [state, tripId]);

  // GPS health monitoring (check every 5 seconds)
  useEffect(() => {
    if (state === "TRACKING") {
      gpsMonitorIntervalRef.current = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastGpsUpdateRef.current;

        if (timeSinceLastUpdate > 15000) { // 15 seconds no updates
          if (gpsStatus !== 'lost') {
            console.warn("GPS signal lost - no updates for 15 seconds");
            setGpsStatus('lost');
          }
        } else if (gpsStatus === 'lost') {
          console.log("GPS signal recovered!");
          setGpsStatus('active');
        }
      }, 5000); // Check every 5 seconds

      return () => {
        if (gpsMonitorIntervalRef.current) {
          clearInterval(gpsMonitorIntervalRef.current);
          gpsMonitorIntervalRef.current = null;
        }
      };
    }
  }, [state, gpsStatus]);

  // Navigation guard - prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state === "TRACKING" && points.length > 0) {
        e.preventDefault();
        e.returnValue = 'Je hebt een actieve rit. Stop eerst je rit voordat je de pagina verlaat.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state, points.length]);

  /**
   * Start GPS tracking
   */
  const handleStart = useCallback(async () => {
    try {
      // Prevent starting if already resuming
      if (isResumingRef.current) {
        console.log("Cannot start - already resuming");
        return;
      }

      setState("REQUESTING_PERMISSION");
      setError(null);

      // Reset state
      setTripId(null);
      setPoints([]);
      setDistance(0);
      setStartAddress("");
      setNotes("");
      creatingTripRef.current = false;

      // Clear any existing timeout
      if (gpsTimeoutRef.current) {
        clearTimeout(gpsTimeoutRef.current);
        gpsTimeoutRef.current = null;
      }

      // Check GPS permission
      if (!navigator.geolocation) {
        setError("GPS wordt niet ondersteund door je browser");
        setState("ERROR");
        return;
      }

      // Check en cancel eventuele bestaande actieve trips voordat we starten
      const activeTripResult = await getActiveLiveTrip();
      if (activeTripResult.success && activeTripResult.data) {
        console.log("Found existing active trip, canceling it first...");
        const cancelResult = await cancelLiveTrip(activeTripResult.data.id);
        if (!cancelResult.success) {
          setError("Kon oude rit niet annuleren: " + cancelResult.error);
          setState("ERROR");
          return;
        }
      }

      setState("STARTING");

      // Activeer wake lock
      const wakeLockSuccess = await screenKeeper.keepScreenOn();
      setWakeLockActive(wakeLockSuccess);

      if (!wakeLockSuccess) {
        console.warn("Wake lock kon niet worden geactiveerd");
      }

      // Set GPS timeout (30 seconds)
      gpsTimeoutRef.current = setTimeout(() => {
        if (state === "STARTING") {
          console.error("GPS timeout during start");
          setError("GPS signaal niet gevonden na 30 seconden. Controleer je GPS instellingen.");
          setState("ERROR");
          gpsTracker.stop();
          if (screenKeeper.isActive()) {
            screenKeeper.allowScreenOff();
          }
        }
      }, 30000);

      // Start GPS tracking
      gpsTracker.start(
        (point: GPSPoint) => {
          // Clear timeout on first successful point
          if (gpsTimeoutRef.current) {
            clearTimeout(gpsTimeoutRef.current);
            gpsTimeoutRef.current = null;
          }

          setCurrentPoint(point);
          setPoints((prev) => {
            // Als dit het eerste punt is, maak dan de trip aan op de server
            // Gebruik ref om race condition te voorkomen
            if (prev.length === 0 && !creatingTripRef.current) {
              creatingTripRef.current = true;
              createServerTrip(point);
            }
            return [...prev, point];
          });
          setDistance(gpsTracker.getTotalDistance());
          setGpsAccuracy(point.accuracy);
          lastGpsUpdateRef.current = Date.now();
        },
        (error: GeolocationPositionError) => {
          console.error("GPS error:", error);

          // Clear timeout on error
          if (gpsTimeoutRef.current) {
            clearTimeout(gpsTimeoutRef.current);
            gpsTimeoutRef.current = null;
          }

          let errorMsg = "GPS fout";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = "GPS toegang geweigerd. Geef toestemming in je browser instellingen.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "GPS locatie niet beschikbaar. Controleer je GPS signaal.";
              break;
            case error.TIMEOUT:
              errorMsg = "GPS timeout. Probeer opnieuw.";
              break;
          }

          setError(errorMsg);
          setState("ERROR");

          // Cleanup
          if (screenKeeper.isActive()) {
            screenKeeper.allowScreenOff();
          }
        }
      );

      startTimeRef.current = new Date();
      setState("TRACKING");
    } catch (err) {
      console.error("Start tracking error:", err);
      setError("Er ging iets mis bij het starten van de tracking");
      setState("ERROR");
    }
  }, []);

  /**
   * Maak trip aan op de server
   */
  const createServerTrip = async (firstPoint: GPSPoint) => {
    try {
      const result = await startLiveTrip({
        carId: vehicleId,
        startLat: firstPoint.latitude,
        startLon: firstPoint.longitude,
      });

      if (result.success) {
        setTripId(result.data.id);
        console.log("Trip created successfully:", result.data.id);
        // Set start address if available
        if (result.data.startAddress) {
          setStartAddress(result.data.startAddress);
        }
      } else {
        console.error("Failed to create trip:", result.error);
        setError(result.error);
        setState("ERROR");

        // Stop GPS tracking on error
        gpsTracker.stop();
        if (screenKeeper.isActive()) {
          screenKeeper.allowScreenOff();
        }
      }
    } finally {
      // Reset flag regardless of success/failure
      creatingTripRef.current = false;
    }
  };

  /**
   * Bevestigde stop (na short trip warning of direct)
   */
  const handleStopConfirmed = useCallback(async () => {
    try {
      setShowStopConfirmDialog(false);
      setShowCancelDialog(false);
      setState("STOPPING");
      setError(null);

      // Stop GPS tracking
      const finalPoints = gpsTracker.stop();
      const finalDistance = gpsTracker.getTotalDistance();

      // Deactiveer wake lock
      await screenKeeper.allowScreenOff();
      setWakeLockActive(false);

      // Update trip op server als deze bestaat
      if (tripId && finalPoints.length > 0) {
        const lastPoint = finalPoints[finalPoints.length - 1];
        const routeGeoJson = gpsTracker.toGeoJSON();

        const result = await stopLiveTrip({
          tripId,
          endLat: lastPoint.latitude,
          endLon: lastPoint.longitude,
          distanceKm: finalDistance,
          routeGeoJson,
        });

        if (result.success) {
          // Redirect naar classificatie pagina met pre-filled data
          const params = new URLSearchParams();
          if (isBusinessTrip !== null) {
            params.set("preType", isBusinessTrip ? "BUSINESS" : "PRIVATE");
          }
          if (notes.trim()) {
            params.set("preNotes", notes.trim());
          }

          router.push(`/registraties/live/classify/${tripId}?${params.toString()}`);
        } else {
          setError(result.error);
          setState("ERROR");
        }
      } else {
        setError("Geen GPS data beschikbaar");
        setState("ERROR");
      }
    } catch (err) {
      console.error("Stop tracking error:", err);
      setError("Er ging iets mis bij het stoppen van de tracking");
      setState("ERROR");
    }
  }, [tripId, router, isBusinessTrip, notes]);

  /**
   * Stop GPS tracking (met short trip check)
   */
  const handleStopClick = useCallback(() => {
    const currentDistance = gpsTracker.getTotalDistance();

    // PRIORITY 1: Check for 0 km trips
    if (currentDistance === 0) {
      setShowZeroKmDialog(true);
      return;
    }

    // PRIORITY 2: Check for short trips (<1 km)
    if (currentDistance < 1.0 && currentDistance > 0) {
      setShowStopConfirmDialog(true);
      return;
    }

    // PRIORITY 3: Standard trips (≥1 km)
    handleStopConfirmed();
  }, [handleStopConfirmed, gpsTracker]);

  /**
   * Start cancellation flow
   */
  const handleCancelClick = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  /**
   * Bevestigde annulering
   */
  const handleCancelConfirmed = useCallback(async () => {
    try {
      setShowCancelDialog(false);
      setState("STOPPING");
      setError(null);

      // Stop GPS tracking
      gpsTracker.stop();

      // Deactiveer wake lock
      await screenKeeper.allowScreenOff();
      setWakeLockActive(false);

      // Annuleer trip op server
      if (tripId) {
        const result = await cancelLiveTrip(tripId);
        if (!result.success) {
          console.error("Failed to cancel trip:", result.error);
        }
      }

      // Reset state en ga terug naar idle
      setTripId(null);
      setPoints([]);
      setDistance(0);
      setStartAddress("");
      setNotes("");
      setState("IDLE");
    } catch (err) {
      console.error("Cancel tracking error:", err);
      setError("Er ging iets mis bij het annuleren van de tracking");
      setState("ERROR");
    }
  }, [tripId]);

  // Bereken totale euro's
  const totalEuros = distance * KM_RATE;

  // Bereken duur
  const duration = startTimeRef.current
    ? Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
    : 0;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-black/80 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          <span className="font-medium">
            {state === "TRACKING" ? "Rit wordt geregistreerd..." : "Live registratie"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* GPS Status Indicator */}
          {state === "TRACKING" && gpsStatus === 'lost' && (
            <span className="text-xs text-orange-400 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              GPS signaal verloren...
            </span>
          )}
          {wakeLockActive && (
            <span className="text-xs text-green-400">Scherm blijft aan</span>
          )}
        </div>
      </div>

      {/* Map (35% van scherm) */}
      <div className="flex-[35] relative">
        {state === "IDLE" || state === "REQUESTING_PERMISSION" || state === "STARTING" ? (
          <div className="h-full bg-muted flex items-center justify-center">
            <div className="text-center space-y-4 p-6">
              {state === "STARTING" && (
                <>
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">Wachten op GPS signaal...</p>
                </>
              )}
              {state === "IDLE" && (
                <p className="text-muted-foreground">
                  Druk op "Start tracking" om te beginnen
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <LiveMap points={points} currentPosition={currentPoint} />

            {/* Overlay: Distance & Euro */}
            {state === "TRACKING" && (
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
                <div className="text-3xl font-bold text-primary">
                  {distance.toFixed(1)} km
                </div>
                <div className="text-lg text-muted-foreground">
                  € {totalEuros.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatDuration(duration)}
                </div>
                {gpsAccuracy !== null && (
                  <div className={`text-xs mt-2 flex items-center gap-1 ${gpsAccuracy > 50 ? 'text-orange-600' : 'text-green-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${gpsAccuracy > 50 ? 'bg-orange-600' : 'bg-green-600'}`} />
                    GPS: {gpsAccuracy < 50 ? 'Goed' : gpsAccuracy < 100 ? 'Matig' : 'Zwak'} ({Math.round(gpsAccuracy)}m)
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom section (65% van scherm) - No scrolling */}
      <div className="flex-[65] bg-background p-2.5 overflow-hidden flex flex-col min-h-0">
        <div className="max-w-2xl mx-auto w-full h-full flex flex-col space-y-1.5 min-h-0">
          {/* Error display - compact */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Trip form - shown during tracking - COMPACT */}
          {state === "TRACKING" && (
            <Card className="p-2 space-y-1.5 shrink-0">
              {/* From & To stacked vertically with icons */}
              <div className="space-y-1.5">
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="from"
                    value={startAddress || ""}
                    placeholder="Vertrek"
                    className="bg-muted h-9 text-sm pl-9"
                    disabled
                  />
                </div>
                <div className="relative">
                  <Flag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="to"
                    value=""
                    placeholder="Bestemming"
                    className="bg-muted h-9 text-sm pl-9 italic text-muted-foreground"
                    disabled
                  />
                </div>
              </div>

              {/* Trip type toggle - two buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant={!isBusinessTrip ? "default" : "outline"}
                  className="h-9 text-sm"
                  onClick={() => setIsBusinessTrip(false)}
                >
                  Privé
                </Button>
                <Button
                  type="button"
                  variant={isBusinessTrip ? "default" : "outline"}
                  className="h-9 text-sm"
                  onClick={() => setIsBusinessTrip(true)}
                >
                  Zakelijk
                </Button>
              </div>

              {/* Notes field - compact */}
              <div className="space-y-0.5">
                <Label htmlFor="notes" className="text-xs">Opmerking</Label>
                <Textarea
                  id="notes"
                  placeholder="Klantbezoek..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-sm resize-none h-14"
                />
              </div>
            </Card>
          )}

          {/* Voertuig info - shown when not tracking */}
          {state !== "TRACKING" && (
            <Card className="p-2.5">
              <div className="text-xs text-muted-foreground">Voertuig</div>
              <div className="font-medium">{vehicleName}</div>
            </Card>
          )}

          {/* Start/Stop button - always at bottom */}
          <div className="space-y-0.5 mt-auto shrink-0">
            {state === "IDLE" || state === "ERROR" || state === "REQUESTING_PERMISSION" || state === "STARTING" ? (
              <Button
                onClick={handleStart}
                className="w-full h-11 text-sm"
                size="lg"
                disabled={state === "REQUESTING_PERMISSION" || state === "STARTING"}
              >
                {state === "STARTING" || state === "REQUESTING_PERMISSION" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    GPS signaal zoeken...
                  </>
                ) : (
                  "Start tracking"
                )}
              </Button>
            ) : state === "TRACKING" ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleCancelClick}
                  variant="outline"
                  className="h-11 text-sm"
                  size="lg"
                >
                  Annuleren
                </Button>
                <Button
                  onClick={handleStopClick}
                  variant="destructive"
                  className="h-11 text-sm"
                  size="lg"
                  disabled={points.length === 0}
                >
                  Stoppen
                </Button>
              </div>
            ) : state === "STOPPING" ? (
              <Button disabled className="w-full h-11 text-sm" size="lg">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Bezig met opslaan...
              </Button>
            ) : null}

            {/* Info text */}
            {state !== "ERROR" && (
              <p className="text-xs text-muted-foreground text-center leading-tight pt-4">
                {state === "IDLE" && "Je scherm blijft automatisch aan tijdens het tracken"}
                {state === "TRACKING" && `${formatDuration(duration)}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 0 km Trip Warning Dialog */}
      <AlertDialog open={showZeroKmDialog} onOpenChange={setShowZeroKmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Geen afstand geregistreerd</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Deze rit heeft 0 kilometer afgelegd. Wil je deze rit toch opslaan?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Custom button layout voor betere mobile UX */}
          <div className="flex flex-col gap-3 mt-4">
            {/* Primary action: Bewaren */}
            <AlertDialogAction
              onClick={() => {
                setShowZeroKmDialog(false);
                handleStopConfirmed();
              }}
              className="w-full h-12 text-base order-1"
            >
              Bewaren
            </AlertDialogAction>

            {/* Destructive action: Verwijderen */}
            <button
              onClick={() => {
                setShowZeroKmDialog(false);
                handleCancelConfirmed();
              }}
              className="w-full h-12 text-base font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors order-2"
            >
              Verwijderen
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stop confirmation dialog (STAGE 6: korte rit) */}
      <AlertDialog open={showStopConfirmDialog} onOpenChange={setShowStopConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Korte rit</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Je hebt een rit van {distance.toFixed(1)} km getraceerd. Dit lijkt wat kort...
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Custom button layout voor betere mobile UX */}
          <div className="flex flex-col gap-3 mt-4">
            {/* Primary action: Ga terug / Cancel */}
            <AlertDialogCancel
              className="w-full h-12 font-semibold text-base order-1"
            >
              Annuleer
            </AlertDialogCancel>

            {/* Secondary action: Bewaren */}
            <AlertDialogAction
              onClick={handleStopConfirmed}
              className="w-full h-12 text-base order-2"
            >
              Ja, bewaren
            </AlertDialogAction>

            {/* Separator voor visuele scheiding */}
            <div className="border-t my-1 order-3" />

            {/* Destructive action: Verwijderen - duidelijk gescheiden */}
            <button
              onClick={() => {
                setShowStopConfirmDialog(false);
                handleCancelConfirmed();
              }}
              className="w-full h-12 text-base font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors order-4"
            >
              Nee, verwijderen
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {distance < 1.0 ? "Korte rit" : "Rit annuleren"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {distance < 1.0 ? (
                <>
                  Je hebt een rit van {distance.toFixed(1)} km getraceerd. Dit lijkt wat kort...
                </>
              ) : (
                "Weet je zeker dat je deze rit wilt annuleren? Alle tracking data gaat verloren."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Custom button layout voor betere mobile UX */}
          {distance < 1.0 ? (
            <div className="flex flex-col gap-3 mt-4">
              {/* Primary action: Ga terug / Cancel */}
              <AlertDialogCancel className="w-full h-12 font-semibold text-base order-1">
                Annuleer
              </AlertDialogCancel>

              {/* Secondary action: Bewaren */}
              <AlertDialogAction
                onClick={handleStopConfirmed}
                className="w-full h-12 text-base order-2"
              >
                Ja, bewaren
              </AlertDialogAction>

              {/* Separator voor visuele scheiding */}
              <div className="border-t my-1 order-3" />

              {/* Destructive action: Verwijderen - duidelijk gescheiden */}
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  handleCancelConfirmed();
                }}
                className="w-full h-12 text-base font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors order-4"
              >
                Nee, verwijderen
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              {/* Primary action: Ga terug / Cancel */}
              <AlertDialogCancel className="w-full h-12 font-semibold text-base order-1">
                Annuleer
              </AlertDialogCancel>

              {/* Separator voor visuele scheiding */}
              <div className="border-t my-1 order-2" />

              {/* Destructive action: Verwijderen - duidelijk gescheiden */}
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  handleCancelConfirmed();
                }}
                className="w-full h-12 text-base font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors order-3"
              >
                Verwijderen
              </button>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
