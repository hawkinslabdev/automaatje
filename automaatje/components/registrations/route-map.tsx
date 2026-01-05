"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteMapProps {
  departureCoords?: { lat: number; lon: number };
  destinationCoords?: { lat: number; lon: number };
  routeGeometry?: any; // GeoJSON geometry from OSRM
  className?: string;
}

export function RouteMap({
  departureCoords,
  destinationCoords,
  routeGeometry,
  className,
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Dynamically import Leaflet (client-side only)
    import("leaflet").then((L) => {
      const isDark = theme === "dark";

      // Initialize map if not already initialized
      if (!mapInstanceRef.current && mapRef.current) {
        // Create map centered on Netherlands
        const map = L.map(mapRef.current).setView([52.1326, 5.2913], 7);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear all existing layers
      map.eachLayer((layer: any) => {
        map.removeLayer(layer);
      });

      // Add appropriate tile layer based on theme
      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      const attribution = isDark
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

      L.tileLayer(tileUrl, {
        attribution,
        maxZoom: 19,
      }).addTo(map);

      // Add departure marker
      if (departureCoords) {
        const departureIcon = L.divIcon({
          html: `<div style="background: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid ${
            isDark ? "#1a1a1a" : "white"
          }; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          className: "",
        });

        L.marker([departureCoords.lat, departureCoords.lon], {
          icon: departureIcon,
        }).addTo(map);
      }

      // Add destination marker
      if (destinationCoords) {
        const destinationIcon = L.divIcon({
          html: `<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid ${
            isDark ? "#1a1a1a" : "white"
          }; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          className: "",
        });

        L.marker([destinationCoords.lat, destinationCoords.lon], {
          icon: destinationIcon,
        }).addTo(map);
      }

      // Add route line if available
      if (routeGeometry && routeGeometry.coordinates) {
        // GeoJSON uses [lon, lat] but Leaflet uses [lat, lon]
        const coordinates = routeGeometry.coordinates.map((coord: number[]) => [
          coord[1],
          coord[0],
        ]);

        L.polyline(coordinates, {
          color: isDark ? "#2563eb" : "#3b82f6",
          weight: 4,
          opacity: 0.7,
        }).addTo(map);
      }

      // Fit bounds if we have both markers
      if (departureCoords && destinationCoords) {
        const bounds = L.latLngBounds(
          [departureCoords.lat, departureCoords.lon],
          [destinationCoords.lat, destinationCoords.lon]
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (departureCoords) {
        map.setView([departureCoords.lat, departureCoords.lon], 13);
      } else if (destinationCoords) {
        map.setView([destinationCoords.lat, destinationCoords.lon], 13);
      }
    });
  }, [departureCoords, destinationCoords, routeGeometry, theme]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <Card className={cn("mt-6", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Route overzicht
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className="w-full h-[500px] rounded-md border"
          style={{ zIndex: 0 }}
        />
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
            <span>Vertrek</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
            <span>Bestemming</span>
          </div>
          {routeGeometry && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-blue-500 rounded" />
              <span>Berekende route</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
