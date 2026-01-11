"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LiveTrackingScreen = dynamic(
  () => import("./live-tracking-screen").then((mod) => mod.LiveTrackingScreen),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

interface LiveTrackingClientWrapperProps {
  vehicleId: string;
  vehicleName: string;
  activeTrip?: {
    id: string;
    startedAt: Date;
    startAddress?: string | null;
    startLat: number;
    startLon: number;
  } | null;
}

export function LiveTrackingClientWrapper(props: LiveTrackingClientWrapperProps) {
  return <LiveTrackingScreen {...props} />;
}
