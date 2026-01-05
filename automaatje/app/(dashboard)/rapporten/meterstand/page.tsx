import { getCurrentUser } from "@/lib/actions/auth";
import { getMeterstandReport, getAvailablePeriodsForUser } from "@/lib/actions/registrations";
import { getUserVehicles } from "@/lib/actions/vehicles";
import { getOrganizations } from "@/lib/actions/organizations";
import { getDateRangeForPeriod } from "@/lib/utils/date-helpers";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { MeterstandReport } from "@/components/rapporten/meterstand-report";
import { Card, CardContent } from "@/components/ui/card";

interface MeterstandPageProps {
  searchParams?: Promise<{
    period?: string;
    vehicle?: string;
    type?: string;
  }>;
}

export default async function MeterstandPage({
  searchParams,
}: MeterstandPageProps) {
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
          <h1 className="text-3xl font-bold tracking-tight">Meterstandrapport</h1>
          <p className="text-muted-foreground">
            Overzicht van je kilometerstandregistraties
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

  // Fetch meterstand report
  const reportResult = await getMeterstandReport({
    startDate,
    endDate,
    vehicleId,
    tripType,
  });

  if (!reportResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meterstandrapport</h1>
          <p className="text-muted-foreground">
            Overzicht van je kilometerstandregistraties
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
        <h1 className="text-3xl font-bold tracking-tight">Meterstandrapport</h1>
        <p className="text-muted-foreground">
          Overzicht van je kilometerstandregistraties
        </p>
      </div>

      <MeterstandReport
        data={reportResult.data || []}
        stats={reportResult.stats!}
        vehicles={vehicles}
        organizations={organizations}
        currentPeriod={period}
        currentVehicle={vehicleId || "all"}
        availableYears={availablePeriods.years}
        availableMonths={availablePeriods.months}
      />
    </div>
  );
}
