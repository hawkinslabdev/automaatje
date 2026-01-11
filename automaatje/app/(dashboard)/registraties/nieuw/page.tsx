import { redirect } from "next/navigation";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserVehicles } from "@/lib/actions/vehicles";
import { getCurrentUser } from "@/lib/actions/auth";
import { getLastTripRegistration } from "@/lib/actions/registrations";
import { getHomeAddress, getFavoriteLocations, getPreviouslyUsedLocations } from "@/lib/actions/locations";
import { TripRegistrationForm } from "@/components/registrations/trip-registration-form";
import { CompleteLastTripPrompt } from "@/components/registrations/complete-last-trip-prompt";



interface NieuweRegistratiePageProps {
  searchParams?: Promise<{
    skipLastTrip?: string;
  }>;
}

export default async function NieuweRegistratiePage({ searchParams }: NieuweRegistratiePageProps) {
  noStore();
  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Check if user has auto-calculate mode enabled
  const isAutoCalculateMode = user.metadata?.preferences?.odometerTracking?.mode === "auto_calculate";

  // Check experimental settings
  const metadata = (user.metadata as any) || {};
  const experimental = metadata.preferences?.experimental || {};
  const showPrivateDetourKm = experimental.showPrivateDetourKm ?? false;

  // Check for skipLastTrip query parameter
  const resolvedParams = await searchParams;
  const skipLastTrip = resolvedParams?.skipLastTrip === 'true';

  // Get user's vehicles
  const vehiclesResult = await getUserVehicles();
  if (!vehiclesResult.success) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Nieuwe rit registreren</h1>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-destructive">Kon voertuigen niet laden</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter enabled vehicles
  const enabledVehicles = (vehiclesResult.data || []).filter((vehicle: any) => {
    const details = vehicle.details;
    return details.isEnabled !== false;
  });

  if (enabledVehicles.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Nieuwe rit registreren</h1>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Geen voertuigen beschikbaar</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Voeg eerst een voertuig toe in je garage voordat je een rit kunt registreren.
              </p>
              <Button asChild>
                <Link href="/garage/nieuw">Voertuig toevoegen</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch location data in parallel
  const [homeResult, favoritesResult, previousResult, registrationsResult] = await Promise.all([
    getHomeAddress(),
    getFavoriteLocations(),
    getPreviouslyUsedLocations(),
    getLastTripRegistration(),
  ]);

  const userHomeAddress = homeResult.data;
  const favoriteLocations = favoritesResult.data || [];
  const previousLocations = (previousResult.data || []).slice(0, 10); // Limit to 10 most recent

  // Get last trip registration for context (excludes meterstand entries)
  let lastRegistration = null;
  let isLastIncomplete = false;

  if (registrationsResult.success && registrationsResult.data) {
    lastRegistration = registrationsResult.data;

    // Smart calculation: If previous trip has distance but no end odometer, calculate it
    const lastData = lastRegistration.data as any;
    if (!lastData.endOdometerKm && lastData.distanceKm) {
      // Calculate the effective end odometer from start + distance
      lastData.calculatedEndOdometer = lastData.startOdometerKm + lastData.distanceKm;
    }

    // Check if last registration is incomplete (missing end odometer)
    isLastIncomplete = !lastData.endOdometerKm;
  }

  return (
    <div className="w-full">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Nieuwe rit registreren</h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">
          Registreer je rit handmatig door de gegevens hieronder in te vullen
        </p>
      </div>

      {/* Block new registration if last one is incomplete AND not skipped */}
      {isLastIncomplete && lastRegistration && !skipLastTrip ? (
        <CompleteLastTripPrompt registration={lastRegistration} />
      ) : (
        <TripRegistrationForm
          vehicles={enabledVehicles}
          userHomeAddress={userHomeAddress}
          favoriteLocations={favoriteLocations}
          previousLocations={previousLocations}
          lastRegistration={lastRegistration}
          isAutoCalculateMode={isAutoCalculateMode}
          showPrivateDetourKm={showPrivateDetourKm}
        />
      )}
    </div>
  );
}
