import { getCurrentUser } from "@/lib/actions/auth";
import { getUserRegistrations, getRegistrationStats, getIncompleteRegistrations, getDailyMileageStats, getMonthlyKilometersTrend, getYearlyPrivateKilometersTrend } from "@/lib/actions/registrations";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Car,
} from "lucide-react";
import Link from "next/link";
import { ActionItemsBanner } from "@/components/registrations/action-items-banner";
import { ActiveTripCard } from "@/components/dashboard/active-trip-card";
import { MileageContributionGraph } from "@/components/dashboard/mileage-contribution-graph";
import { MonthlyKilometersChart } from "@/components/dashboard/monthly-kilometers-chart";
import { YearlyPrivateKilometersChart } from "@/components/dashboard/yearly-private-kilometers-chart";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

export default async function RegistratiesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch data
  const statsResult = await getRegistrationStats();
  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    thisWeek: { trips: 0, kilometers: 0, business: 0 },
    thisMonth: { trips: 0, kilometers: 0, business: 0 },
    thisYear: { trips: 0, kilometers: 0, privateKilometers: 0 },
    total: { trips: 0, kilometers: 0 },
  };

  const registrationsResult = await getUserRegistrations(5);
  const recentRegistrations = registrationsResult.success && registrationsResult.data ? registrationsResult.data : [];

  const incompleteResult = await getIncompleteRegistrations();
  const incompleteRegistrations = incompleteResult.success && incompleteResult.data ? incompleteResult.data : [];

  const dailyStatsResult = await getDailyMileageStats();
  const dailyStats = dailyStatsResult.success && dailyStatsResult.data ? dailyStatsResult.data : [];

  const monthlyTrendResult = await getMonthlyKilometersTrend();
  const monthlyTrend = monthlyTrendResult.success && monthlyTrendResult.data ? monthlyTrendResult.data : {
    currentMonthKm: stats.thisMonth.kilometers,
    previousMonthKm: 0,
    currentMonthName: new Date().toLocaleDateString("nl-NL", { month: "long" }),
    previousMonthName: "",
    dailyData: [],
  };

  const yearlyTrendResult = await getYearlyPrivateKilometersTrend();
  const yearlyTrend = yearlyTrendResult.success && yearlyTrendResult.data ? yearlyTrendResult.data : {
    currentYearKm: stats.thisYear?.privateKilometers || 0,
    previousYearKm: 0,
    currentYear: new Date().getFullYear().toString(),
    previousYear: "",
    monthlyData: [],
  };

  // Check for active live tracking
  const activeTrip = await db.query.liveTrips.findFirst({
    where: and(
      eq(schema.liveTrips.userId, user.id),
      eq(schema.liveTrips.status, "RECORDING")
    ),
    with: {
      vehicle: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Welkom {user.profile.name}!</h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">
            In één oogopslag je recente ritten en statistieken.
          </p>
        </div>
        <Button size="lg" asChild className="lg:hidden">
          <Link href="/registraties/nieuw">
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe registratie
          </Link>
        </Button>
      </div>

      {/* Active Live Trip Card */}
      {activeTrip && (
        <ActiveTripCard
          trip={{
            id: activeTrip.id,
            startedAt: activeTrip.startedAt,
            startAddress: activeTrip.startAddress,
            distanceKm: activeTrip.distanceKm,
            vehicle: activeTrip.vehicle,
          }}
        />
      )}

      {/* Action Items Banner */}
      {incompleteRegistrations.length > 0 && (
        <ActionItemsBanner incompleteRegistrations={incompleteRegistrations} />
      )}

      {/* Stats Grid */}
      <div className="grid gap-3 lg:gap-4 grid-cols-1 lg:grid-cols-4">
        <MileageContributionGraph data={dailyStats} />

        <MonthlyKilometersChart
          currentMonthKm={monthlyTrend.currentMonthKm}
          previousMonthKm={monthlyTrend.previousMonthKm}
          currentMonthName={monthlyTrend.currentMonthName}
          previousMonthName={monthlyTrend.previousMonthName}
          dailyData={monthlyTrend.dailyData}
        />

        <YearlyPrivateKilometersChart
          currentYearKm={yearlyTrend.currentYearKm}
          previousYearKm={yearlyTrend.previousYearKm}
          currentYear={yearlyTrend.currentYear}
          previousYear={yearlyTrend.previousYear}
          monthlyData={yearlyTrend.monthlyData}
        />
      </div>

      {/* Recent Registrations */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base lg:text-lg">Laatste activiteiten</CardTitle>
              <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                  Alles wat je onlangs hebt opgeslagen op een rijtje
              </p>
            </div>
            {recentRegistrations.length > 0 && (
              <Button variant="outline" size="sm" asChild className="lg:shrink-0">
                <Link href="/registraties/overzicht">
                  Alles bekijken
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentRegistrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Car className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nog geen ritten
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Registreer een rit of voeg er een handmatig een toe zodat het hier verschijnt.
              </p>
              <Button asChild>
                <Link href="/registraties/nieuw">
                  <Plus className="mr-2 h-4 w-4" />
                  Leg je eerste rit vast
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 lg:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Datum</TableHead>
                    <TableHead className="whitespace-nowrap">Bestemming</TableHead>
                    <TableHead className="whitespace-nowrap">Voertuig</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Afstand</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Begin km</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Eind km</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {recentRegistrations.map((registration: any) => {
                  const data = registration.data;
                  return (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">
                        {new Date(data.timestamp).toLocaleDateString(
                          "nl-NL",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell>
                        {data.destination?.text || "-"}
                      </TableCell>
                      <TableCell>
                        <span className="md:hidden text-sm">{registration.vehicle.licensePlate}</span>
                        <Badge variant="outline" className="hidden md:inline-flex">{registration.vehicle.licensePlate}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {data.distanceKm
                          ? formatDistance(data.distanceKm)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {data.startOdometerKm ? `${data.startOdometerKm.toLocaleString("nl-NL")} km` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {data.endOdometerKm ? `${data.endOdometerKm.toLocaleString("nl-NL")} km` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {user.role === "ADMIN" && (
        <Card>
          <CardHeader>
            <CardTitle>Systeeminformatie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Je bent ingelogd als <span className="font-medium text-foreground">beheerder</span>.</p>
              <p className="mt-2">Totaal {stats.total.trips} {stats.total.trips === 1 ? "registratie" : "registraties"} in het systeem.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
