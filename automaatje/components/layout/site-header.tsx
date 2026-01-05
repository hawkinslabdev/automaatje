"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "./theme-toggle";

interface SiteHeaderProps {
  onSearchClick?: () => void;
}

export function SiteHeader({ onSearchClick }: SiteHeaderProps) {
  // Detect OS for keyboard shortcut display
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <AppBreadcrumb />

      {/* Search Button */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onSearchClick}
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Zoeken</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  {shortcutLabel}
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Doorzoek ritten en navigeer snel ({shortcutLabel})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
