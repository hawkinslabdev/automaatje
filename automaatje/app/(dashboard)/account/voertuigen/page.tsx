import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUserVehicles } from "@/lib/actions/vehicles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Car, ArrowRight, Plus, Settings } from "lucide-react";
import Link from "next/link";

export default async function VoertuigenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const vehiclesResult = await getUserVehicles();
  const vehicleCount = vehiclesResult.success && vehiclesResult.data ? vehiclesResult.data.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voertuigen</h1>
        <p className="text-muted-foreground">
          Beheer je voertuigen in de garage
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Je garage
              </CardTitle>
              <CardDescription>
                Alle voertuiginstellingen worden beheerd in de garage
              </CardDescription>
            </div>
            <Car className="h-12 w-12 text-muted-foreground opacity-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Aantal voertuigen</p>
                <p className="text-2xl font-bold">{vehicleCount}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            In de garage kun je voertuigen toevoegen, bewerken en verwijderen. 
            Hier stel je ook kentekens, brandstoftypes en andere voertuiggegevens in.
          </p>

          <div className="flex gap-3">
            <Button asChild>
              <Link href="/garage">
                <Car className="mr-2 h-4 w-4" />
                Ga naar garage
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/garage/nieuw">
                <Plus className="mr-2 h-4 w-4" />
                Nieuw voertuig
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
