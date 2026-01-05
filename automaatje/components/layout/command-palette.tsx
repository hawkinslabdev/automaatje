"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  List,
  Car,
  Route,
  Gauge,
  Settings2,
  Inbox,
  Plus,
  Save,
  FileText,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchRegistrations } from "@/lib/actions/search";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { SearchResult, NavigationItem, QuickAction } from "@/lib/types/search";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIsAdmin?: boolean;
}

export function CommandPalette({ open, onOpenChange, userIsAdmin = false }: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const router = useRouter();

  // Keyboard shortcut listener
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Debounced search
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchRegistrations(query);
      if (result.success && result.data) {
        setSearchResults(result.data);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Reset query when dialog closes
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Quick actions (static)
  const quickActions: QuickAction[] = [
    {
      id: "nieuwe-rit",
      title: "Nieuwe rit",
      icon: Plus,
      href: "/registraties/nieuw",
      keywords: ["add", "create", "toevoegen", "nieuw"],
    },
    {
      id: "voertuig-toevoegen",
      title: "Voertuig toevoegen",
      icon: Car,
      href: "/garage/nieuw",
      keywords: ["add", "create", "auto", "voertuig"],
    },
    {
      id: "kilometerstand-opslaan",
      title: "Kilometerstand opslaan",
      icon: Save,
      href: "/registraties/meterstand",
      keywords: ["odometer", "meterstand", "opslaan"],
    },
  ];

  // Navigation items (static)
  const navigationItems: NavigationItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: Home,
      href: "/dashboard",
      keywords: ["home", "overzicht", "dashboard"],
    },
    {
      id: "inbox",
      title: "Meldingen",
      icon: Inbox,
      href: "/inbox",
      keywords: ["notifications", "berichten", "meldingen"],
    },
    {
      id: "registraties-overzicht",
      title: "Alle ritten",
      icon: List,
      href: "/registraties/overzicht",
      keywords: ["trips", "registraties", "overzicht", "ritten"],
    },
    {
      id: "garage",
      title: "Voertuigen",
      icon: Car,
      href: "/garage",
      keywords: ["auto's", "vehicles", "voertuigen", "garage"],
    },
    {
      id: "rapporten-kilometers",
      title: "Kilometeroverzicht",
      icon: Route,
      href: "/rapporten/kilometers",
      keywords: ["rapport", "kilometers", "overzicht"],
    },
    {
      id: "rapporten-meterstand",
      title: "Meterstandrapport",
      icon: Gauge,
      href: "/rapporten/meterstand",
      keywords: ["rapport", "meterstand"],
    },
    {
      id: "instellingen",
      title: "Instellingen",
      icon: Settings2,
      href: "/instellingen",
      keywords: ["settings", "configuratie", "instellingen"],
      adminOnly: true,
    },
  ];

  const handleSelect = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Zoeken in ritten, navigatie, acties..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Zoeken..." : "Geen resultaten gevonden"}
        </CommandEmpty>

        {/* Quick Actions Group */}
        <CommandGroup heading="Snelle acties">
          {quickActions.map((action) => (
            <CommandItem
              key={action.id}
              value={action.id}
              keywords={action.keywords}
              onSelect={() => handleSelect(action.href)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation Group */}
        <CommandGroup heading="Navigatie">
          {navigationItems
            .filter((item) => !item.adminOnly || userIsAdmin)
            .map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                keywords={item.keywords}
                onSelect={() => handleSelect(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
        </CommandGroup>

        {/* Search Results Group */}
        {searchResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Ritten">
              {searchResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  onSelect={() =>
                    handleSelect(`/registraties/overzicht?highlight=${result.id}`)
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm truncate">
                      {result.departure} → {result.destination}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {format(new Date(result.timestamp), "dd MMM yyyy", { locale: nl })}
                      {result.distanceKm && ` • ${result.distanceKm} km`}
                      {` • ${result.vehicleName}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
