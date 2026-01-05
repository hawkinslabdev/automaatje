import { redirect } from "next/navigation";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserVehicles } from "@/lib/actions/vehicles";
import { getCurrentUser } from "@/lib/actions/auth";
import { getHighestOdometerForVehicle } from "@/lib/actions/registrations";
import { OdometerEntryForm } from "@/components/registrations/odometer-entry-form";

export default async function MeterstandPage() {
  noStore();

  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Get user's vehicles
  const vehiclesResult = await getUserVehicles();
  if (!vehiclesResult.success) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Kilometerstand opslaan</h1>
          <p className="text-muted-foreground">
            Leg alleen je kilometerstand vast zonder rit details
          </p>
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
          <h1 className="text-3xl font-bold tracking-tight">Kilometerstand vastleggen</h1>
          <p className="text-muted-foreground">
            Leg alleen je kilometerstand vast zonder rit details
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Geen voertuigen beschikbaar</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Voeg eerst een voertuig toe in je garage voordat je een kilometerstand kunt vastleggen.
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

  // Get highest odometer reading for default value
  const highestOdometerResult = await getHighestOdometerForVehicle();
  let lastRegistration = null;

  if (highestOdometerResult.success && highestOdometerResult.data) {
    lastRegistration = highestOdometerResult.data;
  }

  return (
    <div className="max-w-4xl w-full">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Kilometerstand vastleggen</h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">
          Leg alleen je kilometerstand vast zonder rit details
        </p>
      </div>

      <OdometerEntryForm
        vehicles={enabledVehicles}
        lastRegistration={lastRegistration}
      />
    </div>
  );
}
