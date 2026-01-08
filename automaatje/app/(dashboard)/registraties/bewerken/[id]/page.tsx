import { redirect, notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { getUserVehicles } from "@/lib/actions/vehicles";
import { getCurrentUser } from "@/lib/actions/auth";
import { getRegistrationById, canEditRegistration } from "@/lib/actions/registrations";
import { getHomeAddress, getFavoriteLocations, getPreviouslyUsedLocations } from "@/lib/actions/locations";
import { EditTripForm } from "@/components/registrations/edit-trip-form";
import { EditOdometerForm } from "@/components/registrations/edit-odometer-form";
import { isMeterstandEntry } from "@/lib/utils/registration-types";

interface BewerkenRegistratiePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BewerkenRegistratiePage({ params }: BewerkenRegistratiePageProps) {
  noStore();

  const resolvedParams = await params;
  const registrationId = resolvedParams.id;

  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch registration
  const registrationResult = await getRegistrationById(registrationId);
  if (!registrationResult.success || !registrationResult.data) {
    notFound();
  }

  const registration = registrationResult.data;
  const registrationData = registration.data as any;

  // Check if registration can be edited
  const editCheck = await canEditRegistration(registrationId);
  if (!editCheck.canEdit) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Registratie bewerken</h1>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Kan niet bewerken</h3>
              <p className="text-sm text-muted-foreground">
                {editCheck.reason || "Deze registratie kan niet worden bewerkt."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get user's vehicles
  const vehiclesResult = await getUserVehicles();
  if (!vehiclesResult.success) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Registratie bewerken</h1>
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

  // Fetch location data for trip form
  const [homeResult, favoritesResult, previousResult] = await Promise.all([
    getHomeAddress(),
    getFavoriteLocations(),
    getPreviouslyUsedLocations(),
  ]);

  const userHomeAddress = homeResult.data;
  const favoriteLocations = favoritesResult.data || [];
  const previousLocations = (previousResult.data || []).slice(0, 10);

  // Determine if this is a meterstand entry or trip
  const isMeterstand = isMeterstandEntry(registration);

  // Check if registration has linked trip
  const hasLinkedTrip = !!registrationData.linkedTripId;
  const tripDirection = registrationData.tripDirection;

  // Check if odometer was auto-calculated
  const wasAutoCalculated = registrationData.odometerCalculated;

  // Check if near time restriction limit
  const preferences = user.metadata?.preferences?.editRestrictions;
  const maxDaysBack = preferences?.maxDaysBack || 30;
  const registrationAge = Date.now() - registrationData.timestamp;
  const daysOld = Math.floor(registrationAge / (24 * 60 * 60 * 1000));
  const isNearLimit = daysOld >= maxDaysBack - 3; // Within 3 days of limit

  return (
    <div className="w-full">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Registratie bewerken</h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">
          Pas de gegevens van deze registratie aan
        </p>
      </div>

      {/* Warning alerts */}
      <div className="space-y-3 mb-4">
        {/* Linked trip warning */}
        {hasLinkedTrip && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Gekoppelde rit</AlertTitle>
            <AlertDescription>
              Deze rit is gekoppeld aan een {tripDirection === "heenreis" ? "terugreis" : "heenreis"}.
              Wijzigingen aan deze rit worden niet automatisch doorgevoerd naar de gekoppelde rit.
            </AlertDescription>
          </Alert>
        )}

        {/* Auto-calculated warning */}
        {wasAutoCalculated && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Automatisch berekende kilometerstand</AlertTitle>
            <AlertDescription>
              Deze kilometerstand was automatisch berekend. Na bewerken wordt de kilometerstand als handmatig ingevoerd gemarkeerd.
            </AlertDescription>
          </Alert>
        )}

        {/* Time restriction warning */}
        {isNearLimit && preferences?.enabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Let op: bijna niet meer bewerkbaar</AlertTitle>
            <AlertDescription>
              Deze registratie is {daysOld} {daysOld === 1 ? "dag" : "dagen"} oud. Je kunt registraties tot {maxDaysBack} dagen oud bewerken.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Render appropriate form */}
      {isMeterstand ? (
        <EditOdometerForm
          registration={registration}
          vehicles={enabledVehicles}
        />
      ) : (
        <EditTripForm
          registration={registration}
          vehicles={enabledVehicles}
          userHomeAddress={userHomeAddress}
          favoriteLocations={favoriteLocations}
          previousLocations={previousLocations}
        />
      )}
    </div>
  );
}
