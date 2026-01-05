import { getCurrentUser } from "@/lib/actions/auth";
import { getRegistrationsByDateRange, getAvailablePeriodsForUser } from "@/lib/actions/registrations";
import { getDateRangeForPeriod } from "@/lib/utils/date-helpers";
import { redirect } from "next/navigation";
import { RegistrationsToolbar, ViewMode } from "@/components/registrations/registrations-toolbar";
import { DagView } from "@/components/registrations/views/dag-view";
import { WeekView } from "@/components/registrations/views/week-view";
import { MaandView } from "@/components/registrations/views/maand-view";
import { LijstView } from "@/components/registrations/views/lijst-view";
import { TabelView } from "@/components/registrations/views/tabel-view";
import { CompleteTripDialog } from "@/components/registrations/complete-trip-dialog";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

interface RegistratiesOverzichtPageProps {
  searchParams?: Promise<{
    view?: string;
    period?: string;
    complete?: string;
    incomplete?: string;
  }>;
}

export default async function RegistratiesOverzichtPage({
  searchParams,
}: RegistratiesOverzichtPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Get view and period from search params
  const resolvedParams = await searchParams;
  const view = (resolvedParams?.view as ViewMode) || "dag";
  const period = resolvedParams?.period || "this-month";
  const completeTripId = resolvedParams?.complete;

  // Calculate date range for the selected period
  const { startDate, endDate } = getDateRangeForPeriod(period);

  // Fetch trip data if completing a specific trip
  let tripToComplete = null;
  if (completeTripId) {
    const registration = await db.query.registrations.findFirst({
      where: eq(schema.registrations.id, completeTripId),
      with: {
        vehicle: true,
      },
    });

    if (registration) {
      const data = registration.data as any;
      const vehicleDetails = registration.vehicle?.details as any;
      const vehicleName = vehicleDetails?.make && vehicleDetails?.model
        ? `${vehicleDetails.make} ${vehicleDetails.model}`
        : registration.vehicle?.licensePlate || "Voertuig";

      tripToComplete = {
        id: registration.id,
        vehicleName,
        startOdometer: data.startOdometerKm || 0,
        timestamp: data.timestamp || Date.now(),
        departure: data.departure?.text || "",
        destination: data.destination?.text || "",
      };
    }
  }

  // Fetch available periods for selector
  const availablePeriodsResult = await getAvailablePeriodsForUser();
  const availablePeriods = availablePeriodsResult.success && availablePeriodsResult.data
    ? availablePeriodsResult.data
    : { years: [], months: [] };

  // Fetch registrations for the date range
  const result = await getRegistrationsByDateRange(startDate, endDate);

  const groupedByDate = result.success && result.data ? result.data : {};
  const flatList = result.success && result.flatList ? result.flatList : [];
  const stats = result.success && result.stats ? result.stats : { totalDistance: 0, totalTrips: 0 };

  return (
    <div className="space-y-6">
      <RegistrationsToolbar
        currentView={view}
        currentPeriod={period}
        availableYears={availablePeriods.years}
        availableMonths={availablePeriods.months}
      />

      {/* Render the appropriate view */}
      {view === "dag" && <DagView groupedByDate={groupedByDate} stats={stats} />}
      {view === "week" && <WeekView groupedByDate={groupedByDate} stats={stats} />}
      {view === "maand" && <MaandView groupedByDate={groupedByDate} stats={stats} />}
      {view === "lijst" && <LijstView flatList={flatList} stats={stats} />}
      {view === "tabel" && <TabelView flatList={flatList} stats={stats} />}

      {/* Complete trip dialog - opens when notification clicked */}
      {(completeTripId || tripToComplete) && (
        <CompleteTripDialog
          tripId={completeTripId}
          tripData={tripToComplete || undefined}
        />
      )}
    </div>
  );
}
