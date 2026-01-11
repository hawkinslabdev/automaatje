"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, List, Plus, X, Car, MoreHorizontal, Route, Gauge, FileText, BarChart3, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  unreadCount?: number;
  onMoreClick?: () => void;
  isLiveTrackingActive?: boolean;
}

const navItems = [
  {
    id: "dashboard",
    label: "Start",
    icon: Home,
    href: "/dashboard" as const,
    matchPaths: ["/dashboard"] as const,
    isMainAction: false,
    isMenu: false,
  },
  {
    id: "trips",
    label: "Ritten",
    icon: List,
    href: "/registraties/overzicht" as const,
    matchPaths: ["/registraties/overzicht", "/registraties"] as const,
    isMainAction: false,
    isMenu: false,
  },
  {
    id: "quick-add",
    label: "Rit",
    icon: Plus,
    href: "/registraties/nieuw" as const,
    matchPaths: ["/registraties/nieuw"] as const,
    isMainAction: true,
    isMenu: false,
  },
  {
    id: "rapport",
    label: "Rapport",
    icon: BarChart3,
    href: "/rapporten/kilometers" as const,
    matchPaths: ["/rapporten/kilometers", "/rapporten"] as const,
    isMainAction: false,
    isMenu: false,
  },
  {
    id: "more",
    label: "Meer",
    icon: MoreHorizontal,
    href: null as any,
    matchPaths: [] as const,
    isMainAction: false,
    isMenu: true,
  },
] as const;

export function MobileBottomNav({ unreadCount = 0, onMoreClick, isLiveTrackingActive = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [fabMenuOpen, setFabMenuOpen] = React.useState(false);

  const isActive = (item: typeof navItems[number]) => {
    if (item.matchPaths.length === 0) return false;
    return item.matchPaths.some((path) => pathname.startsWith(path));
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onMoreClick?.();
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/80 backdrop-blur-xl lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex h-16 w-full max-w-full items-center justify-around overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          if (item.isMenu) {
            return (
              <button
                key={item.id}
                onClick={handleMoreClick}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 sm:px-2 py-2 transition-colors",
                  "hover:bg-accent/50 active:bg-accent",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={item.label}
              >
                <div className="relative shrink-0">
                  <Icon className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full p-0 px-1 text-[10px]"
                      variant="destructive"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] leading-none truncate max-w-full">{item.label}</span>
              </button>
            );
          }

          if (item.isMainAction) {
            return (
              <DropdownMenu key={item.id} open={fabMenuOpen} onOpenChange={setFabMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative flex min-w-0 flex-1 flex-col items-center justify-center shrink-0 focus:outline-none"
                    aria-label="Snelle acties"
                  >
                    <div
                      className={cn(
                        "relative flex h-20 w-20 -translate-y-4 items-center justify-center rounded-full shadow-xl transition-all duration-200",
                        "bg-primary text-primary-foreground",
                        "hover:shadow-2xl active:scale-95",
                        fabMenuOpen && "shadow-2xl rotate-90 scale-105"
                      )}
                    >
                      {/* Live tracking indicator */}
                      {isLiveTrackingActive && !fabMenuOpen && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500" />
                        </span>
                      )}
                      {fabMenuOpen ? (
                        <X className="h-8 w-8 transition-transform duration-200" />
                      ) : (
                        <Plus className="h-8 w-8 transition-transform duration-200" />
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  side="top"
                  className="w-72 mb-2"
                  sideOffset={12}
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setFabMenuOpen(false);
                      router.push("/registraties/live");
                    }}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <Navigation className="h-5 w-5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">Start met live registreren</span>
                      <span className="text-xs text-muted-foreground">Registreer direct een rit vanaf vertrek</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => {
                      setFabMenuOpen(false);
                      router.push("/registraties/nieuw");
                    }}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <Route className="h-5 w-5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">Nieuwe handmatige rit</span>
                      <span className="text-xs text-muted-foreground">Registreer een afgelegde rit</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => {
                      setFabMenuOpen(false);
                      router.push("/registraties/meterstand");
                    }}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <Gauge className="h-5 w-5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">Kilometerstand toevoegen</span>
                      <span className="text-xs text-muted-foreground">Leg alleen je kilometerstand vast</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => {
                      setFabMenuOpen(false);
                      router.push("/rapporten/kilometers");
                    }}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <FileText className="h-5 w-5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">Een kilometerrapport aanmaken</span>
                      <span className="text-xs text-muted-foreground">Genereer een overzicht van je ritten</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href!}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 sm:px-2 py-2 transition-colors",
                "hover:bg-accent/50 active:bg-accent",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] leading-none truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
