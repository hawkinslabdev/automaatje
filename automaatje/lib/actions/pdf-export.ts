"use server";

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getCurrentUser } from './auth';
import { getOdometerReadingsReport } from './registrations';
import { getUserVehicles } from './vehicles';
import { getOrganizations } from './organizations';
import { OdometerReportPDF } from '@/lib/pdf/templates/odometer-report-template';
import { generatePDFFilename } from '@/lib/pdf/utils/pdf-helpers';

interface ExportOdometerReportPDFParams {
  startDate: Date;
  endDate: Date;
  periodLabel: string;
  vehicleId?: string;
  tripType?: string;
  organizationId?: string;
}

/**
 * Export odometer report as PDF
 * Generates a professional PDF report matching the Driversnote style
 */
export async function exportOdometerReportPDF(params: ExportOdometerReportPDFParams) {
  try {
    // 1. Authentication check
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // 2. Fetch report data
    const reportResult = await getOdometerReadingsReport({
      startDate: params.startDate,
      endDate: params.endDate,
      vehicleId: params.vehicleId,
      tripType: params.tripType,
    });

    if (!reportResult.success || !reportResult.data || !reportResult.stats) {
      return { success: false, error: reportResult.error || "Kon rapport niet laden" };
    }

    // 3. Fetch vehicle info (if specific vehicle selected)
    let vehicleInfo;
    if (params.vehicleId && params.vehicleId !== 'all') {
      const vehiclesResult = await getUserVehicles();
      if (vehiclesResult.success && vehiclesResult.data) {
        vehicleInfo = vehiclesResult.data.find(v => v.id === params.vehicleId);
      }
    }

    // 4. Fetch organization info (if selected)
    let organizationName;
    if (params.organizationId && params.organizationId !== 'none') {
      const orgsResult = await getOrganizations();
      if (orgsResult.success && orgsResult.data) {
        const org = orgsResult.data.find(o => o.id === params.organizationId);
        organizationName = org?.name;
      }
    }

    // 5. Get kilometers by type from stats
    const totalDistance = Object.values(reportResult.stats.vehicleStats).reduce(
      (sum, v) => sum + (v.totalDistance || 0),
      0
    );
    const businessDistance = reportResult.stats.businessKilometers || 0;
    const commuteDistance = reportResult.stats.commuteKilometers || 0;
    const privateDistance = reportResult.stats.privateKilometers || 0;

    // 6. Transform data for PDF template
    // Sort trips by timestamp ascending (oldest first), then by odometer reading
    const sortedTrips = [...reportResult.data].sort((a, b) => {
      // Primary sort: timestamp
      const timestampDiff = a.parsedData.timestamp - b.parsedData.timestamp;
      if (timestampDiff !== 0) return timestampDiff;

      // Secondary sort: startOdometerKm (when timestamps are equal)
      const odometerA = a.parsedData.startOdometerKm || 0;
      const odometerB = b.parsedData.startOdometerKm || 0;
      return odometerA - odometerB;
    });

    // Split trips with private detours into separate entries (Belastingdienst requirement)
    const expandedTrips = sortedTrips.flatMap(trip => {
      const hasPrivateDetour = trip.parsedData.privateDetourKm && trip.parsedData.privateDetourKm > 0;

      if (!hasPrivateDetour) {
        // Regular trip - return as-is
        return [{
          date: new Date(trip.parsedData.timestamp),
          from: trip.parsedData.departure?.text || '-',
          to: trip.parsedData.destination?.text || '-',
          purpose: trip.parsedData.description || trip.parsedData.tripType || '-',
          odometerStart: trip.parsedData.startOdometerKm || 0,
          odometerEnd: trip.parsedData.endOdometerKm || 0,
          distance: trip.parsedData.distanceKm || 0,
          tripType: trip.parsedData.tripType || '-',
        }];
      }

      // Mixed trip - split into business and private portions
      const businessDistance = (trip.parsedData.distanceKm || 0) - (trip.parsedData.privateDetourKm || 0);
      const businessEndOdometer = (trip.parsedData.startOdometerKm || 0) + businessDistance;

      return [
        // Business portion
        {
          date: new Date(trip.parsedData.timestamp),
          from: trip.parsedData.departure?.text || '-',
          to: trip.parsedData.destination?.text || '-',
          purpose: trip.parsedData.description || 'zakelijk',
          odometerStart: trip.parsedData.startOdometerKm || 0,
          odometerEnd: businessEndOdometer,
          distance: businessDistance,
          tripType: 'zakelijk',
        },
        // Private detour portion
        {
          date: new Date(trip.parsedData.timestamp),
          from: trip.parsedData.destination?.text || '-',
          to: trip.parsedData.destination?.text || '-',
          purpose: 'Privé omrijkilometers',
          odometerStart: businessEndOdometer,
          odometerEnd: trip.parsedData.endOdometerKm || 0,
          distance: trip.parsedData.privateDetourKm || 0,
          tripType: 'privé',
        },
      ];
    });

    const pdfData = {
      driverName: user.profile.name,
      organizationName,
      period: {
        start: params.startDate,
        end: params.endDate,
        label: params.periodLabel,
      },
      summary: {
        totalTrips: reportResult.stats.totalReadings,
        totalDistance,
        businessDistance,
        commuteDistance,
        privateDistance,
      },
      trips: expandedTrips,
      vehicle: vehicleInfo ? {
        licensePlate: vehicleInfo.licensePlate,
        name: vehicleInfo.details?.naamVoertuig,
      } : undefined,
      generatedDate: new Date(),
    };

    // 7. Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(OdometerReportPDF, pdfData) as any
    );

    // 8. Return buffer as base64 (for client download)
    const filename = generatePDFFilename({
      organizationName,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    return {
      success: true,
      data: {
        buffer: pdfBuffer.toString('base64'),
        filename,
      },
    };

  } catch (error) {
    console.error('PDF export error:', error);
    return {
      success: false,
      error: "Kon PDF niet genereren. Probeer het later opnieuw.",
    };
  }
}
