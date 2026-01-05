"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity } from "lucide-react";

interface DailyStats {
  date: string;
  kilometers: number;
  trips: number;
}

interface MileageContributionGraphProps {
  data: DailyStats[];
}

export function MileageContributionGraph({ data }: MileageContributionGraphProps) {
  // Show last 365 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365);
  
  // Create a map of date -> stats for quick lookup
  const statsMap = new Map(data.map(d => [d.date, d]));
  
  // Generate all weeks
  const weeks: DailyStats[][] = [];
  let currentWeek: DailyStats[] = [];
  
  // Start from 365 days ago
  const date = new Date(startDate);
  
  // Pad the beginning if the year doesn't start on Sunday
  const firstDayOfWeek = date.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: "", kilometers: 0, trips: 0 });
  }
  
  while (date <= endDate) {
    const dateStr = date.toISOString().split('T')[0];
    const stats = statsMap.get(dateStr);
    
    currentWeek.push({
      date: dateStr,
      kilometers: stats?.kilometers || 0,
      trips: stats?.trips || 0,
    });
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    date.setDate(date.getDate() + 1);
  }
  
  // Add remaining days to complete the last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: "", kilometers: 0, trips: 0 });
    }
    weeks.push(currentWeek);
  }
  
  // Calculate max for color scaling
  const maxKm = Math.max(...data.map(d => d.kilometers), 1);
  
  // Get color intensity based on kilometers
  const getColor = (km: number) => {
    if (km === 0) return "bg-muted";
    const intensity = Math.min(km / maxKm, 1);
    if (intensity < 0.25) return "bg-green-200 dark:bg-green-900";
    if (intensity < 0.5) return "bg-green-300 dark:bg-green-700";
    if (intensity < 0.75) return "bg-green-400 dark:bg-green-600";
    return "bg-green-500 dark:bg-green-500";
  };
  
  const months = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
  
  const totalKm = data.reduce((sum, d) => sum + d.kilometers, 0);
  const totalTrips = data.reduce((sum, d) => sum + d.trips, 0);
  
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-medium">
            Activiteit afgelopen jaar
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {totalTrips} {totalTrips === 1 ? "rit" : "ritten"} • {Math.round(totalKm)} km gereden afgelopen jaar
          </p>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="pb-4">
        <div className="overflow-x-auto -mx-2 px-2">
          <TooltipProvider delayDuration={0}>
            <div className="inline-flex gap-0.5 lg:gap-1 min-w-full">
              {/* Day labels */}
              <div className="flex flex-col gap-0.5 lg:gap-1 text-[10px] lg:text-xs text-muted-foreground pr-1 lg:pr-2 pt-5 lg:pt-6 shrink-0">
                {days.map((day, i) => (
                  <div key={day} className="h-2.5 lg:h-3 flex items-center justify-end" style={{ opacity: i % 2 === 1 ? 1 : 0 }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Contribution grid */}
              <div className="flex flex-col gap-0.5 lg:gap-1 flex-1 min-w-0">
                {/* Month labels */}
                <div className="flex gap-0.5 lg:gap-1 text-[10px] lg:text-xs text-muted-foreground h-4 lg:h-5 mb-0.5">
                  {weeks.map((week, weekIdx) => {
                    const firstDay = week.find(d => d.date);
                    if (!firstDay || !firstDay.date) return <div key={weekIdx} className="w-2.5 lg:w-3 shrink-0" />;

                    const date = new Date(firstDay.date);
                    const currentMonth = date.getMonth();

                    // Check if this is the first week where this month appears
                    let showMonth = false;
                    if (weekIdx === 0) {
                      showMonth = true;
                    } else {
                      const prevWeek = weeks[weekIdx - 1];
                      const prevFirstDay = prevWeek.find(d => d.date);
                      if (prevFirstDay && prevFirstDay.date) {
                        const prevMonth = new Date(prevFirstDay.date).getMonth();
                        showMonth = currentMonth !== prevMonth;
                      } else {
                        showMonth = true;
                      }
                    }

                    return (
                      <div key={weekIdx} className="w-2.5 lg:w-3 shrink-0">
                        {showMonth && months[currentMonth]}
                      </div>
                    );
                  })}
                </div>

                {/* Grid rows (days of week) */}
                <div className="flex gap-0.5 lg:gap-1">
                  {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-0.5 lg:gap-1 shrink-0">
                      {week.map((day, dayIdx) => {
                        if (!day.date) {
                          return <div key={dayIdx} className="w-2.5 h-2.5 lg:w-3 lg:h-3" />;
                        }

                        const date = new Date(day.date);
                        const formattedDate = date.toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        });

                        return (
                          <Tooltip key={dayIdx}>
                            <TooltipTrigger asChild>
                              <button
                                className={`w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-sm ${getColor(day.kilometers)} hover:ring-2 hover:ring-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary`}
                                aria-label={`${formattedDate}: ${day.trips} ${day.trips === 1 ? "rit" : "ritten"}, ${Math.round(day.kilometers)} km`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="text-xs">
                                <div className="font-semibold">{formattedDate}</div>
                                <div>{day.trips} {day.trips === 1 ? "rit" : "ritten"}</div>
                                <div>{Math.round(day.kilometers)} km</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
