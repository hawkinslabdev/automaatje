"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, LayoutGrid, List, Table, BarChart3, Filter, Download, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PeriodSelector } from "./period-selector";
import { getAdjacentPeriod } from "@/lib/utils/date-helpers";

export type ViewMode = "dag" | "week" | "maand" | "lijst" | "tabel";

const viewModeConfig = {
  dag: { icon: Calendar, label: "Dag" },
  week: { icon: BarChart3, label: "Week" },
  maand: { icon: LayoutGrid, label: "Maand" },
  lijst: { icon: List, label: "Lijst" },
  tabel: { icon: Table, label: "Tabel" },
};

const periodOptions = [
  { value: "today", label: "Vandaag" },
  { value: "this-week", label: "Deze week" },
  { value: "this-month", label: "Deze maand" },
  { value: "last-month", label: "Vorige maand" },
  { value: "this-year", label: "Dit jaar" },
];

interface RegistrationsToolbarProps {
  currentView: ViewMode;
  currentPeriod: string;
  availableYears: number[];
  availableMonths: Array<{ year: number; month: number }>;
}

export function RegistrationsToolbar({
  currentView,
  currentPeriod,
  availableYears,
  availableMonths,
}: RegistrationsToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleViewChange = (view: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`/registraties/overzicht?${params.toString()}`);
  };

  const handlePeriodChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`/registraties/overzicht?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with title and action buttons */}
      <div className="flex flex-col gap-3 lg:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Ritten</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Overzicht van je kilometerregistraties
          </p>
        </div>
        {/* Hide action buttons on mobile - accessible via FAB */}
        <div className="hidden lg:flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filteren
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Exporteren
          </Button>
          <Button size="sm" asChild>
            <Link href="/registraties/nieuw">
              <Plus className="mr-2 h-4 w-4" />
              Nieuw
            </Link>
          </Button>
        </div>
      </div>

      {/* View mode and period selector */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* View mode toggle buttons - scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {(Object.entries(viewModeConfig) as [ViewMode, typeof viewModeConfig[ViewMode]][]).map(
              ([mode, config]) => {
                const Icon = config.icon;
                const isActive = currentView === mode;
                return (
                  <Button
                    key={mode}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => handleViewChange(mode)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </Button>
                );
              }
            )}
          </div>
        </div>

        {/* Period selector with navigation */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden lg:inline">Periode:</span>

          {/* Previous button */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => {
              const prev = getAdjacentPeriod(currentPeriod, 'prev', availableYears);
              if (prev) handlePeriodChange(prev);
            }}
            disabled={!getAdjacentPeriod(currentPeriod, 'prev', availableYears)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Period selector */}
          <PeriodSelector
            currentPeriod={currentPeriod}
            availableYears={availableYears}
            availableMonths={availableMonths}
            onPeriodChange={handlePeriodChange}
          />

          {/* Next button */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => {
              const next = getAdjacentPeriod(currentPeriod, 'next', availableYears);
              if (next) handlePeriodChange(next);
            }}
            disabled={!getAdjacentPeriod(currentPeriod, 'next', availableYears)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
