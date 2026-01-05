"use server";

import { requireAuth } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { enqueueJob } from "@/lib/jobs";
import { isMeterstandEntry } from "@/lib/utils/registration-types";

/**
 * Generate a monthly mileage report for a vehicle
 * Creates a report and sends a notification when complete
 */
export async function generateMonthlyReport(
  vehicleId: string,
  year: number,
  month: number // 1-12
) {
  try {
    const session = await requireAuth();

    // Verify vehicle belongs to user or is shared
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, vehicleId),
      with: {
        shares: true,
      },
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    // Check access
    const isOwner = vehicle.userId === session.userId;
    const hasAccess = vehicle.shares.some(
      (share) => share.sharedWithUserId === session.userId
    );

    if (!isOwner && !hasAccess) {
      return { success: false, error: "Geen toegang tot dit voertuig" };
    }

    // Calculate date range
    const startDate = new Date(year, month - 1, 1); // Month is 0-indexed
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // Fetch registrations for this period
    const allRegistrations = await db.query.registrations.findMany({
      where: and(
        eq(schema.registrations.userId, session.userId!),
        eq(schema.registrations.vehicleId, vehicleId)
      ),
      orderBy: [desc(schema.registrations.createdAt)],
    });

    // Filter by date range and exclude meterstand entries
    const filteredRegistrations = allRegistrations.filter((reg) => {
      const data = reg.data as any;
      const timestamp = data.timestamp;

      if (isMeterstandEntry(reg)) return false;
      if (timestamp < startDate.getTime()) return false;
      if (timestamp > endDate.getTime()) return false;

      return true;
    });

    // Calculate statistics
    const totalTrips = filteredRegistrations.length;
    const totalKilometers = filteredRegistrations.reduce((sum, reg) => {
      const data = reg.data as any;
      return sum + (data.distanceKm || 0);
    }, 0);

    const businessTrips = filteredRegistrations.filter(
      (r) => (r.data as any).tripType === "zakelijk"
    ).length;
    const businessKilometers = filteredRegistrations
      .filter((r) => (r.data as any).tripType === "zakelijk")
      .reduce((sum, reg) => {
        const data = reg.data as any;
        return sum + (data.distanceKm || 0);
      }, 0);

    const report = {
      vehicleId,
      year,
      month,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      statistics: {
        totalTrips,
        totalKilometers: Math.round(totalKilometers * 10) / 10,
        businessTrips,
        businessKilometers: Math.round(businessKilometers * 10) / 10,
        privateTrips: totalTrips - businessTrips,
        privateKilometers: Math.round((totalKilometers - businessKilometers) * 10) / 10,
      },
      registrations: filteredRegistrations,
      generatedAt: new Date().toISOString(),
    };

    // Get vehicle details for notification
    const vehicleDetails = vehicle.details as any;
    const vehicleName = vehicleDetails.make && vehicleDetails.model
      ? `${vehicleDetails.make} ${vehicleDetails.model}`
      : vehicle.licensePlate;

    // Get month name in Dutch
    const monthNames = [
      "januari", "februari", "maart", "april", "mei", "juni",
      "juli", "augustus", "september", "oktober", "november", "december"
    ];
    const monthName = monthNames[month - 1];

    // Send notification that report is ready
    await enqueueJob("notification", {
      userId: session.userId!,
      notificationData: {
        type: "report_generated",
        title: "Rapport klaar",
        message: `Je ${monthName} ${year} rapport voor ${vehicleName} is beschikbaar (${totalTrips} ritten, ${Math.round(totalKilometers)} km).`,
        priority: "normal",
        icon: "FileText",
        color: "blue",
        action: {
          label: "Bekijk rapport",
          url: `/rapporten/kilometers?vehicle=${vehicleId}&year=${year}&month=${month}`,
        },
        relatedVehicleId: vehicleId,
      },
    });

    console.log(`Monthly report generated and notification enqueued for ${monthName} ${year}`);

    return { success: true, data: report };
  } catch (error) {
    console.error("Generate monthly report error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Kon rapport niet genereren" };
  }
}

/**
 * Generate a yearly mileage report for a vehicle
 * Creates a report and sends a notification when complete
 */
export async function generateYearlyReport(vehicleId: string, year: number) {
  try {
    const session = await requireAuth();

    // Verify vehicle belongs to user or is shared
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, vehicleId),
      with: {
        shares: true,
      },
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    // Check access
    const isOwner = vehicle.userId === session.userId;
    const hasAccess = vehicle.shares.some(
      (share) => share.sharedWithUserId === session.userId
    );

    if (!isOwner && !hasAccess) {
      return { success: false, error: "Geen toegang tot dit voertuig" };
    }

    // Calculate date range
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st

    // Fetch registrations for this period
    const allRegistrations = await db.query.registrations.findMany({
      where: and(
        eq(schema.registrations.userId, session.userId!),
        eq(schema.registrations.vehicleId, vehicleId)
      ),
      orderBy: [desc(schema.registrations.createdAt)],
    });

    // Filter by date range and exclude meterstand entries
    const filteredRegistrations = allRegistrations.filter((reg) => {
      const data = reg.data as any;
      const timestamp = data.timestamp;

      if (isMeterstandEntry(reg)) return false;
      if (timestamp < startDate.getTime()) return false;
      if (timestamp > endDate.getTime()) return false;

      return true;
    });

    // Calculate statistics
    const totalTrips = filteredRegistrations.length;
    const totalKilometers = filteredRegistrations.reduce((sum, reg) => {
      const data = reg.data as any;
      return sum + (data.distanceKm || 0);
    }, 0);

    const businessTrips = filteredRegistrations.filter(
      (r) => (r.data as any).tripType === "zakelijk"
    ).length;
    const businessKilometers = filteredRegistrations
      .filter((r) => (r.data as any).tripType === "zakelijk")
      .reduce((sum, reg) => {
        const data = reg.data as any;
        return sum + (data.distanceKm || 0);
      }, 0);

    // Calculate monthly breakdown
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(year, i, 1);
      const monthEnd = new Date(year, i + 1, 0, 23, 59, 59);

      const monthRegistrations = filteredRegistrations.filter((reg) => {
        const data = reg.data as any;
        return (
          data.timestamp >= monthStart.getTime() &&
          data.timestamp <= monthEnd.getTime()
        );
      });

      const monthKm = monthRegistrations.reduce((sum, reg) => {
        const data = reg.data as any;
        return sum + (data.distanceKm || 0);
      }, 0);

      return {
        month: i + 1,
        trips: monthRegistrations.length,
        kilometers: Math.round(monthKm * 10) / 10,
      };
    });

    const report = {
      vehicleId,
      year,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      statistics: {
        totalTrips,
        totalKilometers: Math.round(totalKilometers * 10) / 10,
        businessTrips,
        businessKilometers: Math.round(businessKilometers * 10) / 10,
        privateTrips: totalTrips - businessTrips,
        privateKilometers: Math.round((totalKilometers - businessKilometers) * 10) / 10,
      },
      monthlyBreakdown,
      registrations: filteredRegistrations,
      generatedAt: new Date().toISOString(),
    };

    // Get vehicle details for notification
    const vehicleDetails = vehicle.details as any;
    const vehicleName = vehicleDetails.make && vehicleDetails.model
      ? `${vehicleDetails.make} ${vehicleDetails.model}`
      : vehicle.licensePlate;

    // Send notification that report is ready
    await enqueueJob("notification", {
      userId: session.userId!,
      notificationData: {
        type: "report_generated",
        title: "Jaarrapport klaar",
        message: `Je ${year} jaarrapport voor ${vehicleName} is beschikbaar (${totalTrips} ritten, ${Math.round(totalKilometers)} km).`,
        priority: "normal",
        icon: "FileText",
        color: "blue",
        action: {
          label: "Bekijk rapport",
          url: `/rapporten/kilometers?vehicle=${vehicleId}&year=${year}`,
        },
        relatedVehicleId: vehicleId,
      },
    });

    console.log(`Yearly report generated and notification enqueued for ${year}`);

    return { success: true, data: report };
  } catch (error) {
    console.error("Generate yearly report error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Kon jaarrapport niet genereren" };
  }
}
