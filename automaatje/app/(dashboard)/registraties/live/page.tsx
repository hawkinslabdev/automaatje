import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { eq, and, lt } from "drizzle-orm";
import { LiveTrackingClientWrapper } from "@/components/live-tracking/live-tracking-client-wrapper";

export default async function LiveTrackingPage() {
  // Check authenticatie
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  // Cleanup stale RECORDING trips (older than 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await db
    .update(schema.liveTrips)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(
      and(
        eq(schema.liveTrips.userId, session.userId),
        eq(schema.liveTrips.status, "RECORDING"),
        lt(schema.liveTrips.startedAt, twoHoursAgo)
      )
    );

  // Check of er een actieve trip is
  const activeTrip = await db.query.liveTrips.findFirst({
    where: and(
      eq(schema.liveTrips.userId, session.userId),
      eq(schema.liveTrips.status, "RECORDING")
    ),
  });

  // Als er een voltooide trip is, redirect naar classificatie
  if (activeTrip && activeTrip.status === "COMPLETED") {
    redirect(`/registraties/live/classify/${activeTrip.id}`);
  }

  // Haal voertuigen op van de gebruiker
  const vehicles = await db.query.vehicles.findMany({
    where: eq(schema.vehicles.userId, session.userId),
  });

  // Ook gedeelde voertuigen ophalen
  const sharedVehicles = await db.query.vehicleShares.findMany({
    where: eq(schema.vehicleShares.sharedWithUserId, session.userId),
    with: {
      vehicle: true,
    },
  });

  const allVehicles = [
    ...vehicles,
    ...sharedVehicles.map((share) => share.vehicle),
  ];

  if (allVehicles.length === 0) {
    redirect("/garage/nieuw");
  }

  // Zoek het hoofdvoertuig
  const mainVehicle = allVehicles.find(
    (v) => v.details && typeof v.details === "object" && "isMain" in v.details && v.details.isMain === true
  ) || allVehicles[0];

  // Bepaal voertuig naam
  let vehicleName = mainVehicle.licensePlate;
  if (
    mainVehicle.details &&
    typeof mainVehicle.details === "object" &&
    "naamVoertuig" in mainVehicle.details &&
    mainVehicle.details.naamVoertuig
  ) {
    vehicleName = mainVehicle.details.naamVoertuig as string;
  } else if (
    mainVehicle.details &&
    typeof mainVehicle.details === "object" &&
    "make" in mainVehicle.details &&
    "model" in mainVehicle.details &&
    mainVehicle.details.make &&
    mainVehicle.details.model
  ) {
    vehicleName = `${mainVehicle.details.make} ${mainVehicle.details.model}`;
  }

  return (
    <div className="-m-4 h-screen overflow-hidden">
      <LiveTrackingClientWrapper
        vehicleId={mainVehicle.id}
        vehicleName={vehicleName}
        activeTrip={activeTrip ? {
          id: activeTrip.id,
          startedAt: new Date(activeTrip.startedAt),
          startAddress: activeTrip.startAddress,
          startLat: activeTrip.startLat,
          startLon: activeTrip.startLon
        } : null}
      />
    </div>
  );
}
