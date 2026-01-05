import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUserVehicles } from "@/lib/actions/vehicles";
import { getUserRegistrations } from "@/lib/actions/registrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { OdometerTrackingSettings } from "@/components/account/odometer-tracking-settings";

export default async function KilometerlezingenPage() {
  noStore();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Get user's vehicles
  const vehiclesResult = await getUserVehicles();
  const vehicles = vehiclesResult.success ? vehiclesResult.data || [] : [];

  // Get all registrations to show odometer history
  const registrationsResult = await getUserRegistrations();
  const registrations = registrationsResult.success ? registrationsResult.data || [] : [];

  // Get current odometer tracking preferences
  const odometerPreferences = user.metadata?.preferences?.odometerTracking;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kilometerlezingen</h1>
        <p className="text-muted-foreground">
          Beheer hoe je kilometerstand wordt bijgehouden en bekijk je geschiedenis
        </p>
      </div>

      <OdometerTrackingSettings
        user={user}
        vehicles={vehicles}
        registrations={registrations}
        currentPreferences={odometerPreferences}
      />
    </div>
  );
}
