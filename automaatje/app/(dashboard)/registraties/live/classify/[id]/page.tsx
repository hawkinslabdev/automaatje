import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getLiveTrip } from "@/lib/actions/live-trips";
import { TripClassification } from "@/components/live-tracking/trip-classification";

export default async function ClassifyTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preType?: string; preNotes?: string }>;
}) {
  const { id } = await params;
  const { preType, preNotes } = await searchParams;
  // Check authenticatie
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  // Haal de trip op
  const result = await getLiveTrip(id);

  if (!result.success) {
    notFound();
  }

  const trip = result.data;

  // Check of trip voltooid is
  if (trip.status !== "COMPLETED") {
    redirect("/registraties/live");
  }

  // Check of trip al geclassificeerd is
  if (trip.tripType) {
    redirect("/registraties/overzicht");
  }

  return <TripClassification trip={trip} preType={preType} preNotes={preNotes} />;
}
