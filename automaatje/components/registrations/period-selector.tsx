"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPeriodLabel, getDutchMonthName } from "@/lib/utils/date-helpers";

interface PeriodSelectorProps {
  currentPeriod: string;
  availableYears: number[];
  availableMonths: Array<{ year: number; month: number }>;
  onPeriodChange: (period: string) => void;
}

const QUICK_PICKS = [
  { value: "today", label: "Vandaag" },
  { value: "this-week", label: "Deze week" },
  { value: "this-month", label: "Deze maand" },
  { value: "last-month", label: "Vorige maand" },
  { value: "this-year", label: "Dit jaar" },
];

export function PeriodSelector({
  currentPeriod,
  availableYears,
  availableMonths,
  onPeriodChange,
}: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[0] || new Date().getFullYear()
  );

  const handleSelect = (period: string) => {
    onPeriodChange(period);
    setOpen(false);
  };

  const monthsForSelectedYear = availableMonths.filter(
    (m) => m.year === selectedYear
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[140px] sm:min-w-[180px] justify-between">
          <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">{formatPeriodLabel(currentPeriod)}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0" align="end">
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="quick">Snel</TabsTrigger>
            <TabsTrigger value="years">Jaren</TabsTrigger>
            <TabsTrigger value="months">Maanden</TabsTrigger>
          </TabsList>

          {/* Quick Picks Tab */}
          <TabsContent value="quick" className="p-2">
            <div className="grid gap-1">
              {QUICK_PICKS.map((pick) => (
                <Button
                  key={pick.value}
                  variant={currentPeriod === pick.value ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => handleSelect(pick.value)}
                >
                  {pick.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          {/* Years Tab */}
          <TabsContent value="years" className="p-2">
            <ScrollArea className="h-[240px]">
              <div className="grid gap-1">
                {availableYears.map((year) => (
                  <Button
                    key={year}
                    variant={currentPeriod === `year-${year}` ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => handleSelect(`year-${year}`)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Months Tab */}
          <TabsContent value="months" className="p-2 space-y-3">
            {/* Year selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Jaar:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="flex-1 rounded-md border px-3 py-1.5 text-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Month grid */}
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((monthIndex) => {
                  const month = monthIndex + 1;
                  const hasData = monthsForSelectedYear.some(
                    (m) => m.month === month
                  );
                  const periodValue = `month-${selectedYear}-${String(month).padStart(2, '0')}`;

                  return (
                    <Button
                      key={monthIndex}
                      variant={currentPeriod === periodValue ? "default" : "ghost"}
                      size="sm"
                      disabled={!hasData}
                      onClick={() => handleSelect(periodValue)}
                      className="text-xs"
                    >
                      {getDutchMonthName(monthIndex).substring(0, 3)}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
