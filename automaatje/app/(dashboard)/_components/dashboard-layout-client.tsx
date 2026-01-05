"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MoreMenuSheet } from "@/components/layout/more-menu-sheet";
import { CommandPalette } from "@/components/layout/command-palette";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { useDevice } from "@/hooks/use-device";

interface DashboardLayoutClientProps {
  user: {
    name: string;
    email: string;
    role: string;
    avatarSeed?: string;
  };
  version: string;
  userIsAdmin: boolean;
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  user,
  version,
  userIsAdmin,
  children,
}: DashboardLayoutClientProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Get device info
  const { isMobileOrTablet } = useDevice();

  // Get unread count with auto-refresh every 30 seconds
  const unreadCount = useUnreadCount(30000);

  // Desktop Layout (>= 1024px): Sidebar + SiteHeader
  if (!isMobileOrTablet) {
    return (
      <>
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          userIsAdmin={userIsAdmin}
        />
        <SidebarProvider>
          <AppSidebar user={user} version={version} unreadCount={unreadCount} />
          <SidebarInset>
            <SiteHeader onSearchClick={() => setCommandPaletteOpen(true)} />
            <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </>
    );
  }

  // Mobile/Tablet Layout (< 1024px): MobileHeader + BottomNav + MoreMenu
  return (
    <>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        userIsAdmin={userIsAdmin}
      />
      <MoreMenuSheet
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        user={user}
        unreadCount={unreadCount}
        userIsAdmin={userIsAdmin}
      />
      <div className="flex min-h-screen max-w-full flex-col overflow-x-hidden">
        <MobileHeader
          onSearchClick={() => setCommandPaletteOpen(true)}
          unreadCount={unreadCount}
        />
        <main className="flex-1 pb-20 overflow-x-hidden">
          <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        </main>
        <MobileBottomNav
          unreadCount={unreadCount}
          onMoreClick={() => setMoreMenuOpen(true)}
        />
      </div>
    </>
  );
}
