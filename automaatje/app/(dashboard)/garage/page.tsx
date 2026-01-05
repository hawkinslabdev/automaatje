import { getCurrentUser } from "@/lib/actions/auth";
import { getUserVehicles } from "@/lib/actions/vehicles";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car as CarIcon, Plus, Star, Power } from "lucide-react";
import Link from "next/link";
import { VehicleCard } from "@/components/garage/vehicle-card";
import type { schema } from "@/lib/db";

type Vehicle = typeof schema.vehicles.$inferSelect;

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

export default async function GaragePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const vehiclesResult = await getUserVehicles();
  const vehicles = vehiclesResult.success ? vehiclesResult.data : [];

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Voertuigen</h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">
            Beheer je voertuigen en kentekens in je garage
          </p>
        </div>
        <Button size="lg" asChild className="w-full md:w-auto">
          <Link href="/garage/nieuw">
            <Plus className="mr-2 h-4 w-4" />
            Voertuig toevoegen
          </Link>
        </Button>
      </div>

      {/* Vehicles Grid */}
      {vehicles && vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <CarIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nog geen voertuigen
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Voeg je eerste voertuig toe om te beginnen met het 
                registreren van je kilometers.
              </p>
              <Button asChild>
                <Link href="/garage/nieuw">
                  <Plus className="mr-2 h-4 w-4" />
                  Eerste voertuig toevoegen
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles?.map((vehicle: Vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}

      {/* Info Card */}
      {vehicles && vehicles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Over je garage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Star className="h-4 w-4 mt-0.5 text-primary" />
              <p>
                <span className="font-medium text-foreground">Hoofdvoertuig</span> wordt
                automatisch geselecteerd bij nieuwe registraties
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Power className="h-4 w-4 mt-0.5" />
              <p>
                <span className="font-medium text-foreground">Uitgeschakelde voertuigen</span> zijn
                niet beschikbaar voor nieuwe registraties
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
