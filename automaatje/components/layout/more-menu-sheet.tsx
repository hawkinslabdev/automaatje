"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Route,
  Gauge,
  FileText,
  Settings2,
  User,
  LogOut,
  ChevronRight,
  Bell,
  Car,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import { useTheme } from "next-themes";

interface MoreMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name: string;
    email: string;
    role: string;
    avatarSeed?: string;
  };
  unreadCount?: number;
  userIsAdmin?: boolean;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
  showBadge?: boolean;
}

const menuSections = {
  quick: [
    {
      title: "Meldingen",
      href: "/inbox",
      icon: Bell,
      showBadge: true,
    },
    {
      title: "Garage",
      href: "/garage",
      icon: Car,
    },
  ] as MenuItem[],
  reports: [
    {
      title: "Kilometeroverzicht",
      href: "/rapporten/kilometers",
      icon: Route,
    },
    {
      title: "Meterstandrapport",
      href: "/rapporten/meterstand",
      icon: Gauge,
    },
    {
      title: "Alle rapporten",
      href: "/rapporten",
      icon: FileText,
    },
  ] as MenuItem[],
  system: [
    {
      title: "Instellingen",
      href: "/instellingen",
      icon: Settings2,
      adminOnly: true,
    },
    {
      title: "Account",
      href: "/account",
      icon: User,
    },
  ] as MenuItem[],
};

export function MoreMenuSheet({
  open,
  onOpenChange,
  user,
  unreadCount = 0,
  userIsAdmin = false,
}: MoreMenuSheetProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarUrl = user.avatarSeed
    ? `https://api.dicebear.com/7.x/initials/svg?seed=${user.avatarSeed}`
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <div className="flex h-full flex-col">
          {/* User Profile Header */}
          <SheetHeader className="border-b p-6 pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start text-left">
                <SheetTitle className="text-base font-semibold">
                  {user.name}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.role === "ADMIN" && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Beheerder
                  </Badge>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto">
            {/* Quick Actions */}
            <div className="px-2 py-3">
              <div className="px-4 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Snel
                </h3>
              </div>
              <div className="space-y-1">
                {menuSections.quick.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                        "hover:bg-accent active:bg-accent/80"
                      )}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium">
                        {item.title}
                      </span>
                      {item.showBadge && unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Reports */}
            <div className="px-2 py-3">
              <div className="px-4 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rapportage
                </h3>
              </div>
              <div className="space-y-1">
                {menuSections.reports.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                        "hover:bg-accent active:bg-accent/80"
                      )}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium">
                        {item.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* System */}
            <div className="px-2 py-3">
              <div className="px-4 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mijn gegevens
                </h3>
              </div>
              <div className="space-y-1">
                {menuSections.system
                  .filter((item) => !item.adminOnly || userIsAdmin)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavigation(item.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                          "hover:bg-accent active:bg-accent/80"
                        )}
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium">
                          {item.title}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })}
              </div>
            </div>

            <Separator />

            {/* Theme Selector */}
            <div className="px-2 py-3">
              <div className="px-4 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Uiterlijk
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 px-4">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all",
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <Sun className={cn(
                    "h-5 w-5",
                    theme === "light" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    theme === "light" ? "text-primary" : "text-muted-foreground"
                  )}>
                    Licht
                  </span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all",
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <Moon className={cn(
                    "h-5 w-5",
                    theme === "dark" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    theme === "dark" ? "text-primary" : "text-muted-foreground"
                  )}>
                    Donker
                  </span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all",
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <Monitor className={cn(
                    "h-5 w-5",
                    theme === "system" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    theme === "system" ? "text-primary" : "text-muted-foreground"
                  )}>
                    Auto
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                "flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                "bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30",
                isLoggingOut && "opacity-50 cursor-not-allowed"
              )}
            >
              <LogOut className="h-5 w-5" />
              <span className="flex-1 text-sm font-semibold">
                {isLoggingOut ? "Uitloggen..." : "Uitloggen"}
              </span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
