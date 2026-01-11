"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Circle, useMap } from "react-leaflet";
import type { GPSPoint } from "@/lib/services/gps-tracker.service";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix voor Leaflet icon issues in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LiveMapProps {
  points: GPSPoint[];
  currentPosition: GPSPoint | null;
}

/**
 * Component om de kaart te centreren op de huidige positie
 */
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center[0], center[1], map]);

  return null;
}

/**
 * Live Map component voor GPS tracking
 * Toont real-time route en huidige positie
 */
export function LiveMap({ points, currentPosition }: LiveMapProps) {
  const mapRef = useRef<L.Map>(null);

  // Converteer GPS punten naar Leaflet formaat [lat, lon]
  const pathCoordinates: [number, number][] = points.map((p) => [
    p.latitude,
    p.longitude,
  ]);

  // Bepaal center van de kaart
  const center: [number, number] = currentPosition
    ? [currentPosition.latitude, currentPosition.longitude]
    : points.length > 0
    ? [points[0].latitude, points[0].longitude]
    : [52.0907, 5.1214]; // Centrum Nederland als fallback

  return (
    <div className="relative h-full w-full min-h-0 min-w-0">
      <MapContainer
        center={center}
        zoom={15}
        className="h-full w-full z-0"
        zoomControl={false}
        ref={mapRef}
        style={{ minHeight: '200px', minWidth: '200px' }}
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-center op huidige positie */}
        <MapCenterController center={center} />

        {/* Route lijn (blauw) */}
        {pathCoordinates.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            pathOptions={{
              color: "#3B82F6", // blue-500
              weight: 4,
              opacity: 0.8,
            }}
          />
        )}

        {/* Huidige positie (pulserende blauwe cirkel) */}
        {currentPosition && (
          <>
            <Circle
              center={[currentPosition.latitude, currentPosition.longitude]}
              radius={currentPosition.accuracy}
              pathOptions={{
                color: "#3B82F6",
                fillColor: "#3B82F6",
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
            <Circle
              center={[currentPosition.latitude, currentPosition.longitude]}
              radius={10}
              pathOptions={{
                color: "#1D4ED8", // blue-700
                fillColor: "#3B82F6",
                fillOpacity: 0.8,
                weight: 3,
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Distance & Value overlay (top-right) */}
      {/* This will be rendered separately by the parent component */}
    </div>
  );
}
