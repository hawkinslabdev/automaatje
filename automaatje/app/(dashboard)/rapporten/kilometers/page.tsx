import { getCurrentUser } from "@/lib/actions/auth";
import { getOdometerReadingsReport, getAvailablePeriodsForUser } from "@/lib/actions/registrations";
import { getUserVehicles } from "@/lib/actions/vehicles";
import { getOrganizations } from "@/lib/actions/organizations";
import { getDateRangeForPeriod } from "@/lib/utils/date-helpers";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { OdometerReport } from "@/components/rapporten/odometer-report";
import { Card, CardContent } from "@/components/ui/card";

interface KilometerrapportPageProps {
  searchParams?: Promise<{
    period?: string;
    vehicle?: string;
    type?: string;
  }>;
}

export default async function KilometerrapportPage({
  searchParams,
}: KilometerrapportPageProps) {
  noStore();

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Get search params
  const resolvedParams = await searchParams;
  const period = resolvedParams?.period || "this-month";
  const vehicleId = resolvedParams?.vehicle;
  const tripType = resolvedParams?.type;

  // Calculate date range for the selected period
  const { startDate, endDate } = getDateRangeForPeriod(period);

  // Fetch available periods for selector
  const availablePeriodsResult = await getAvailablePeriodsForUser();
  const availablePeriods = availablePeriodsResult.success && availablePeriodsResult.data
    ? availablePeriodsResult.data
    : { years: [], months: [] };

  // Fetch user's vehicles
  const vehiclesResult = await getUserVehicles();
  if (!vehiclesResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kilometeroverzicht</h1>
          <p className="text-muted-foreground">
            Gedetailleerd overzicht van je kilometerstandregistraties
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

  const vehicles = vehiclesResult.data || [];

  // Fetch user's organizations
  const organizationsResult = await getOrganizations();
  const organizations = organizationsResult.success && organizationsResult.data
    ? organizationsResult.data
    : [];

  // Fetch odometer readings report
  const reportResult = await getOdometerReadingsReport({
    startDate,
    endDate,
    vehicleId,
    tripType,
  });

  if (!reportResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kilometeroverzicht</h1>
          <p className="text-muted-foreground">
            Gedetailleerd overzicht van je kilometerstandregistraties
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-destructive">
                {reportResult.error || "Kon rapport niet laden"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kilometeroverzicht</h1>
        <p className="text-muted-foreground">
          Gedetailleerd overzicht van je kilometerstandregistraties
        </p>
      </div>

      <OdometerReport
        data={reportResult.data || []}
        stats={reportResult.stats!}
        vehicles={vehicles}
        organizations={organizations}
        currentPeriod={period}
        currentVehicle={vehicleId || "all"}
        currentTripType={tripType || "all"}
        availableYears={availablePeriods.years}
        availableMonths={availablePeriods.months}
      />
    </div>
  );
}
