"use client";

import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Car, FileText, Inbox, Home, Settings2 } from "lucide-react";

interface BreadcrumbSegment {
  title: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
}

// Navigation structure from sidebar
const navigationMap: Record<string, BreadcrumbSegment> = {
  "/": { title: "Dashboard", href: "/dashboard", icon: Home },
  "/dashboard": { title: "Dashboard", href: "/dashboard", icon: Home },

  // Ritten (registraties)
  "/registraties": { title: "Ritten", href: "/registraties" },
  "/registraties/overzicht": { title: "Overzicht", href: "/registraties/overzicht" },
  "/registraties/nieuw": { title: "Nieuwe rit", href: "/registraties/nieuw" },
  "/registraties/meterstand": { title: "Kilometerstand opslaan", href: "/registraties/meterstand" },
  "/registraties/bewerken": { title: "Bewerken", href: "/registraties/bewerken" },

  "/inbox": { title: "Meldingen", href: "/inbox", icon: Inbox },
  "/inbox/archief": { title: "Archief", href: "/inbox/archief" },

  "/garage": { title: "Voertuigen", href: "/garage", icon: Car },
  "/garage/nieuw": { title: "Voertuig toevoegen", href: "/garage/nieuw" },

  "/instellingen": { title: "Instellingen", href: "/instellingen", icon: Settings2 },
  "/account": { title: "Account", href: "/account" },

  "/rapporten": { title: "Rapporten", href: "/rapporten", icon: FileText },
  "/rapporten/kilometers": { title: "Kilometeroverzicht", href: "/rapporten/kilometers" },
  "/rapporten/meterstand": { title: "Meterstandrapport", href: "/rapporten/meterstand" },

};

// Parent mapping for nested routes
const parentMap: Record<string, string> = {
  // Inbox
  "/inbox/archief": "/inbox",
  "/inbox": "/dashboard",

  // Registraties (Ritten)
  "/registraties": "/dashboard",
  "/registraties/overzicht": "/registraties",
  "/registraties/nieuw": "/registraties",
  "/registraties/meterstand": "/registraties",
  "/registraties/bewerken": "/registraties/overzicht",

  // Garage
  "/garage": "/dashboard",
  "/garage/nieuw": "/garage",

  // Rapporten
  "/rapporten": "/dashboard",
  "/rapporten/kilometers": "/rapporten",
  "/rapporten/meterstand": "/rapporten",

  // Other top-level
  "/instellingen": "/dashboard",
  "/account": "/dashboard",
};

function normalizePath(pathname: string) {
  if (!pathname) return "/dashboard";
  const noTrailing = pathname === "/" ? "/dashboard" : pathname.replace(/\/$/, "");

  // Handle dynamic routes
  // Match /registraties/bewerken/[id] -> /registraties/bewerken
  if (noTrailing.match(/^\/registraties\/bewerken\/[^/]+$/)) {
    return "/registraties/bewerken";
  }

  return noTrailing || "/dashboard";
}

function buildBreadcrumbs(current: string): BreadcrumbSegment[] {
  const crumbs: BreadcrumbSegment[] = [];

  // Walk up via parentMap, collect parents only (not current page)
  const chain: BreadcrumbSegment[] = [];
  let p = parentMap[current];

  while (p) {
    const seg = navigationMap[p];
    if (seg) chain.push(seg);
    p = parentMap[p];
  }

  // chain is from nearest parent -> root, so reverse to root -> nearest parent
  chain.reverse();

  // Always start with Dashboard (if we're not already on it)
  const dashboard = navigationMap["/dashboard"];
  if (dashboard && current !== "/dashboard") {
    crumbs.push(dashboard);
  }

  // Add parents, skipping duplicate dashboard if parent chain already includes it
  for (const seg of chain) {
    if (seg.href === "/dashboard" && crumbs.some((c) => c.href === "/dashboard")) continue;
    crumbs.push(seg);
  }

  return crumbs;
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  const currentKey = normalizePath(pathname);

  const breadcrumbs = buildBreadcrumbs(currentKey);
  const currentPage = navigationMap[currentKey];

  // If we're at root/dashboard and there are no breadcrumbs, show the current page
  if (breadcrumbs.length === 0 && currentPage) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2">
              {currentPage.icon && <currentPage.icon className="h-4 w-4" />}
              {currentPage.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // No breadcrumbs to show
  if (breadcrumbs.length === 0 && !currentPage) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((segment, index) => {
          const isFirst = index === 0;
          const isIntermediate = index > 0 && index < breadcrumbs.length - 1;

          return (
            <BreadcrumbItem
              key={segment.href}
              className={isIntermediate ? "hidden sm:inline-flex" : ""}
            >
              <BreadcrumbLink href={segment.href} className="flex items-center gap-2">
                {segment.icon && <segment.icon className="h-4 w-4" />}
                <span className={isFirst ? "hidden sm:inline" : ""}>{segment.title}</span>
              </BreadcrumbLink>
              {(index < breadcrumbs.length - 1 || currentPage) && (
                <BreadcrumbSeparator className={isIntermediate ? "hidden sm:inline" : ""} />
              )}
            </BreadcrumbItem>
          );
        })}

        {currentPage && (
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2">
              {currentPage.icon && <currentPage.icon className="h-4 w-4" />}
              {currentPage.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
