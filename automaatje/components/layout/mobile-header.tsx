"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onSearchClick?: () => void;
  unreadCount?: number;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Meldingen",
  "/registraties": "Ritten",
  "/registraties/overzicht": "Ritten overzicht",
  "/registraties/nieuw": "Nieuwe rit",
  "/registraties/meterstand": "Kilometerstand",
  "/garage": "Garage",
  "/rapporten": "Rapporten",
  "/rapporten/kilometers": "Kilometeroverzicht",
  "/rapporten/meterstand": "Meterstandrapport",
  "/instellingen": "Instellingen",
  "/account": "Account",
};

export function MobileHeader({
  title,
  showBack,
  onSearchClick,
  unreadCount = 0,
}: MobileHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const displayTitle = title || routeTitles[pathname] || "Automaatje";

  const handleBack = () => {
    router.back();
  };

  const canGoBack = showBack !== undefined ? showBack : pathname !== "/dashboard";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "lg:hidden" // Hide on desktop
      )}
    >
      <div className="flex h-14 items-center px-4">
        {/* Left: Back button or Logo */}
        <div className="flex items-center gap-2">
          {canGoBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-9 w-9"
              aria-label="Terug"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="h-9 w-9" /> // Spacer for alignment
          )}
        </div>

        {/* Center: Title */}
        <div className="flex-1 text-center">
          <h1 className="text-base font-semibold truncate px-2">
            {displayTitle}
          </h1>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-1">
          {onSearchClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchClick}
              className="h-9 w-9"
              aria-label="Zoeken"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/inbox")}
            className="relative h-9 w-9"
            aria-label="Meldingen"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full p-0 px-1 text-[10px]"
                variant="destructive"
              >
                {unreadCount > 99 ? "99" : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
