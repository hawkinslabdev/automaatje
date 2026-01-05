import type { LucideIcon } from "lucide-react";

export interface SearchResult {
  id: string;
  departure: string;
  destination: string;
  description: string;
  timestamp: number;
  distanceKm?: number;
  tripType: string;
  vehicleId: string;
  vehicleName: string;
}

export interface NavigationItem {
  id: string;
  title: string;
  icon: LucideIcon;
  href: string;
  keywords: string[];
  adminOnly?: boolean;
}

export interface QuickAction {
  id: string;
  title: string;
  icon: LucideIcon;
  href: string;
  keywords: string[];
}

export interface SearchActionResult {
  success: boolean;
  data?: SearchResult[];
  error?: string;
}
